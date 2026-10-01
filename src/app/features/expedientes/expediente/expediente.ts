import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Steps } from 'primeng/steps';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';

import {
  ESTADO_INFO,
  type EstadoExpediente,
} from '../../../core/models/expediente.model';
import {
  type ArchivoDetalle,
  type ExpedienteDetalle,
} from '../../../core/models/expediente-detalle.model';
import { type RespuestaValidacion } from '../../../core/models/validacion.model';
import { ArchivoService } from '../../../core/services/archivo.service';
import { DevAuthService } from '../../../core/services/dev-auth.service';
import { ExpedienteService } from '../../../core/services/expediente.service';
import { BadgeEtapa } from '../../../shared/badge-etapa/badge-etapa';
import { ValidacionDrawer } from '../../validacion/validacion-drawer/validacion-drawer';

@Component({
  selector: 'app-vista-expediente',
  imports: [BadgeEtapa, Button, RouterLink, Steps, Tag, Toast, ValidacionDrawer],
  templateUrl: './expediente.html',
  styleUrl: './expediente.scss',
})
export class VistaExpediente implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly auth = inject(DevAuthService);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly archivoService = inject(ArchivoService);
  private readonly mensajes = inject(MessageService);

  protected readonly detalle = signal<ExpedienteDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly urlCarta = signal<SafeResourceUrl | null>(null);
  protected readonly drawerValidacion = signal(false);
  protected readonly completando = signal(false);

  private blobUrlCarta?: string;

  protected readonly pasos = [
    { label: 'Carta Docente' },
    { label: 'Carta VRIN / OPP' },
    { label: 'Resolución' },
    { label: 'Rendición' },
  ];

  protected readonly indiceActivo = computed(() =>
    Math.max((this.detalle()?.etapa_actual ?? 1) - 1, 0),
  );

  protected readonly carta = computed(() => {
    const archivos = this.detalle()?.archivos ?? [];
    return archivos.find((a) => a.tipo === 'CARTA_DOCENTE') ?? null;
  });

  protected readonly observacionesPendientes = computed(() =>
    (this.detalle()?.observaciones ?? []).filter((o) => o.resuelta_at === null),
  );

  // HU-25: Calidad valida solo expedientes EN_REVISION_CALIDAD con documentos completos.
  protected readonly puedeValidar = computed(() => {
    const e = this.detalle();
    return (
      this.auth.usuarioActual()?.rol === 'CALIDAD' &&
      e?.estado === 'EN_REVISION_CALIDAD' &&
      e.documentos_completos
    );
  });

  // Subsanación (RN-12): Secretaría/Admin completa los documentos de un OBSERVADO.
  protected readonly puedeCompletarDocumentos = computed(() => {
    const rol = this.auth.usuarioActual()?.rol ?? '';
    return ['SECRETARIA', 'ADMINISTRADOR'].includes(rol) && this.detalle()?.estado === 'OBSERVADO';
  });

  // HU-26: contador «x/3 Verificados» del checklist persistido (SECRETARIA/ADMIN).
  protected readonly mostrarContadorChecklist = computed(() => {
    const rol = this.auth.usuarioActual()?.rol ?? '';
    return ['SECRETARIA', 'ADMINISTRADOR'].includes(rol);
  });

  protected readonly verificados = computed(() => {
    const checklist = this.detalle()?.validacion_calidad?.checklist;
    if (!checklist) {
      return 0;
    }
    return Object.values(checklist).filter(Boolean).length;
  });

  protected readonly severidadBadge = computed<'success' | 'warn' | 'danger'>(() => {
    const estado = this.detalle()?.estado;
    return estado ? (ESTADO_INFO[estado]?.severity ?? 'warn') : 'warn';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.router.navigate(['/expedientes']);
      return;
    }
    this.expedienteService.obtener(id).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
        this.prepararVistaCarta(detalle);
        // La bandeja abre el drawer directo al pulsar «Validar Requisitos».
        if (this.route.snapshot.queryParamMap.get('accion') === 'validar') {
          this.drawerValidacion.set(true);
        }
      },
      error: (error) => {
        this.cargando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'Expediente no disponible',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'No se pudo cargar el expediente.',
        });
        this.router.navigate(['/expedientes']);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.blobUrlCarta) {
      URL.revokeObjectURL(this.blobUrlCarta);
    }
  }

  protected abrirValidacion(): void {
    this.drawerValidacion.set(true);
  }

  protected alGuardarValidacion(respuesta: RespuestaValidacion): void {
    this.mensajes.add({
      severity: respuesta.estado === 'VALIDADO_CALIDAD' ? 'success' : 'warn',
      summary: 'Validación registrada',
      detail:
        respuesta.estado === 'VALIDADO_CALIDAD'
          ? 'El expediente cumple los requisitos y quedó validado.'
          : 'El expediente no cumple los requisitos; se registró la observación.',
    });
    this.recargar();
  }

  protected completarDocumentos(): void {
    const e = this.detalle();
    if (!e || this.completando()) {
      return;
    }
    this.completando.set(true);
    this.expedienteService.marcarDocumentosCompletos(e.id).subscribe({
      next: () => {
        this.completando.set(false);
        this.mensajes.add({
          severity: 'success',
          summary: 'Documentos completos',
          detail: 'El expediente pasó a revisión de Calidad.',
        });
        this.recargar();
      },
      error: (error) => {
        this.completando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo subsanar',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'No se pudo marcar los documentos como completos.',
        });
      },
    });
  }

  private recargar(): void {
    const e = this.detalle();
    if (!e) {
      return;
    }
    this.expedienteService.obtener(e.id).subscribe({
      next: (detalle) => this.detalle.set(detalle),
    });
  }

  protected descargarCarta(): void {
    const detalle = this.detalle();
    const carta = this.carta();
    if (!detalle || !carta) {
      return;
    }
    this.archivoService.obtenerBlob(detalle.id, carta.id, true).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = carta.nombre_original;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.mensajes.add({
          severity: 'error',
          summary: 'Descarga fallida',
          detail: 'No se pudo descargar la carta del docente.',
        });
      },
    });
  }

  protected formatoSoles(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return `S/ ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  protected formatoFecha(fecha: string | null | undefined): string {
    if (!fecha) {
      return '—';
    }
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

  protected etiquetaEstado(estado: EstadoExpediente): string {
    return ESTADO_INFO[estado]?.label ?? estado;
  }

  protected condicionLaboral(tipo: string): string {
    return tipo === 'NOMBRADO' ? 'Nombrado' : tipo === 'CONTRATADO' ? 'Contratado' : tipo;
  }

  protected iniciales(nombre: string | null | undefined): string {
    if (!nombre) {
      return '?';
    }
    const palabras = nombre.trim().split(/\s+/);
    return (palabras[0]?.[0] ?? '') + (palabras[1]?.[0] ?? '');
  }

  protected checklistItems(checklist: Record<string, boolean>): { etiqueta: string; cumple: boolean }[] {
    const etiquetas: Record<string, string> = {
      carta_aceptacion: 'Carta Oficial de Aceptación',
      docente_ordinario_contratado: 'Docente Ordinario/Contratado',
      afiliacion_universidad: 'Contar con afiliación a la Universidad',
    };
    return Object.entries(checklist).map(([clave, cumple]) => ({
      etiqueta: etiquetas[clave] ?? clave,
      cumple: Boolean(cumple),
    }));
  }

  private prepararVistaCarta(detalle: ExpedienteDetalle): void {
    const carta: ArchivoDetalle | null =
      detalle.archivos.find((a) => a.tipo === 'CARTA_DOCENTE') ?? null;
    if (!carta || !(carta.mime ?? '').toLowerCase().includes('pdf')) {
      return;
    }
    this.archivoService.obtenerBlob(detalle.id, carta.id).subscribe({
      next: (blob) => {
        this.blobUrlCarta = URL.createObjectURL(blob);
        this.urlCarta.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrlCarta));
      },
      error: () => {
        this.mensajes.add({
          severity: 'warn',
          summary: 'Vista previa no disponible',
          detail: 'No se pudo cargar la vista previa de la carta; usa «Descargar PDF».',
        });
      },
    });
  }
}
