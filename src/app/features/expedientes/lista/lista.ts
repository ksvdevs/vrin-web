import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { Toast } from 'primeng/toast';

import {
  ESTADOS_EXPEDIENTE,
  ESTADO_INFO,
  type EstadoExpediente,
  type ExpedienteFila,
} from '../../../core/models/expediente.model';
import type { Plantilla } from '../../../core/models/plantilla.model';
import { DevAuthService } from '../../../core/services/dev-auth.service';
import {
  ExpedienteService,
  type FiltrosExpediente,
} from '../../../core/services/expediente.service';
import { PlantillaService, SeleccionService } from '../../../core/services/plantilla.service';
import { BadgeEtapa } from '../../../shared/badge-etapa/badge-etapa';
import { ConfirmDialog } from 'primeng/confirmdialog';

@Component({
  selector: 'app-lista-expedientes',
  imports: [
    BadgeEtapa,
    Button,
    ConfirmDialog,
    DatePicker,
    Dialog,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    Select,
    TableModule,
    Toast,
  ],
  templateUrl: './lista.html',
  styleUrl: './lista.scss',
})
export class ListaExpedientes implements OnInit {
  protected readonly auth = inject(DevAuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly seleccionService = inject(SeleccionService);
  private readonly mensajes = inject(MessageService);

  protected readonly filas = signal<ExpedienteFila[]>([]);
  protected readonly cargando = signal(false);
  protected readonly total = signal(0);
  protected readonly primeraFila = signal(0);
  protected readonly dialogoFiltros = signal(false);

  // HU-41 — selección vigente de plantillas (solo administrador).
  protected readonly plantillasCarta = signal<Plantilla[]>([]);
  protected readonly plantillasResolucion = signal<Plantilla[]>([]);
  protected readonly seleccionCartaId = signal<number | null>(null);
  protected readonly seleccionResolucionId = signal<number | null>(null);

  protected readonly esSecretariaOAdmin = computed(() =>
    ['SECRETARIA', 'ADMINISTRADOR'].includes(this.auth.usuarioActual()?.rol ?? ''),
  );

  protected readonly esAdmin = computed(
    () => this.auth.usuarioActual()?.rol === 'ADMINISTRADOR',
  );

  protected readonly opcionesEstado = ESTADOS_EXPEDIENTE.map((estado) => ({
    label: ESTADO_INFO[estado].label,
    value: estado,
  }));

  protected readonly filtroForm = this.fb.group({
    estado: [null as EstadoExpediente | null],
    desde: [null as Date | null],
    hasta: [null as Date | null],
  });

  private filtrosAplicados: FiltrosExpediente = {};

  ngOnInit(): void {
    this.auth.cargarUsuarioActual().subscribe();
    this.cargarSeleccionPlantillas();
  }

  // HU-41 — plantillas activas por tipo + selección vigente (solo admin).
  private cargarSeleccionPlantillas(): void {
    this.plantillaService.listar(1).subscribe({
      next: (plantillas) => this.plantillasCarta.set(plantillas.filter((p) => p.estado === 'ACTIVO')),
      error: () => {},
    });
    this.plantillaService.listar(2).subscribe({
      next: (plantillas) =>
        this.plantillasResolucion.set(plantillas.filter((p) => p.estado === 'ACTIVO')),
      error: () => {},
    });
    this.seleccionService.listarVigentes().subscribe({
      next: (selecciones) => {
        for (const seleccion of selecciones) {
          const id = seleccion.plantilla?.id ?? null;
          if (seleccion.tipo_documento?.codigo === 'CARTA') {
            this.seleccionCartaId.set(id);
          }
          if (seleccion.tipo_documento?.codigo === 'RESOLUCION') {
            this.seleccionResolucionId.set(id);
          }
        }
      },
      error: () => {},
    });
  }

  protected alCambiarPlantilla(tipoDocumentoId: number, plantillaId: number | null): void {
    if (plantillaId === null) {
      return;
    }
    this.seleccionService
      .seleccionar({ modulo: 'ARTICULOS', tipo_documento_id: tipoDocumentoId, plantilla_id: plantillaId })
      .subscribe({
        next: () => {
          this.mensajes.add({
            severity: 'success',
            summary: 'Plantilla seleccionada',
            detail: 'La selección vigente se actualizó (RN-13).',
          });
        },
        error: (error) => {
          this.mensajes.add({
            severity: 'error',
            summary: 'No se pudo seleccionar',
            detail:
              (error as { error?: { message?: string } })?.error?.message ??
              'Ocurrió un error inesperado.',
          });
        },
      });
  }

  protected alCargarLazy(event: TableLazyLoadEvent): void {
    const filasPorPagina = Number(event.rows) || 5;
    const pagina = Math.floor((event.first ?? 0) / filasPorPagina) + 1;
    this.primeraFila.set(event.first ?? 0);
    this.cargar(pagina);
  }

  protected abrirFiltros(): void {
    this.dialogoFiltros.set(true);
  }

  protected aplicarFiltros(): void {
    const valores = this.filtroForm.getRawValue();
    this.filtrosAplicados = {
      estado: valores.estado ?? undefined,
      desde: this.fechaIso(valores.desde),
      hasta: this.fechaIso(valores.hasta),
    };
    this.primeraFila.set(0);
    this.dialogoFiltros.set(false);
    this.cargar(1);
  }

  protected limpiarFiltros(): void {
    this.filtroForm.reset({ estado: null, desde: null, hasta: null });
    this.filtrosAplicados = {};
    this.primeraFila.set(0);
    this.cargar(1);
  }

  protected hayFiltros(): boolean {
    return Boolean(
      this.filtrosAplicados.estado || this.filtrosAplicados.desde || this.filtrosAplicados.hasta,
    );
  }

  protected navegar(fila: ExpedienteFila): void {
    this.router.navigate(['/expedientes', fila.id]);
  }

  protected editarFila(fila: ExpedienteFila): void {
    this.router.navigate(['/expedientes', fila.id, 'editar']);
  }

  private readonly confirmacion = inject(ConfirmationService);

  protected confirmarEliminar(fila: ExpedienteFila): void {
    this.confirmacion.confirm({
      message: `¿Estás seguro de eliminar lógicamente el expediente ${fila.codigo}? Esta acción no se puede deshacer.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.cargando.set(true);
        this.expedienteService.eliminar(fila.id).subscribe({
          next: () => {
            this.mensajes.add({
              severity: 'success',
              summary: 'Expediente eliminado',
              detail: `El expediente ${fila.codigo} fue eliminado.`,
            });
            this.cargar(Math.floor(this.primeraFila() / 5) + 1);
          },
          error: (error) => {
            this.cargando.set(false);
            this.mensajes.add({
              severity: 'error',
              summary: 'Error al eliminar',
              detail: (error as any)?.error?.message ?? 'No se pudo eliminar el expediente.',
            });
          },
        });
      },
    });
  }

  protected severidadAccion(clave: string): 'success' | 'danger' | 'secondary' {
    switch (clave) {
      case 'generar_carta':
      case 'generar_resolucion':
        return 'success';
      case 'revisar_rendicion':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.expedienteService.listar(this.filtrosAplicados, pagina).subscribe({
      next: (respuesta) => {
        this.filas.set(respuesta.data);
        this.total.set(respuesta.meta.total);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'Sin conexión',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'No se pudo obtener la bandeja de expedientes.',
        });
      },
    });
  }

  private fechaIso(fecha: Date | null): string | undefined {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      return undefined;
    }
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
