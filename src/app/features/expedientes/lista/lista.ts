import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, forkJoin, Subscription } from 'rxjs';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { DatePicker } from 'primeng/datepicker';
import { ConfirmationService, MessageService, type MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Toast } from 'primeng/toast';

import {
  ESTADOS_EXPEDIENTE,
  ESTADO_INFO,
  type EstadoExpediente,
  type ExpedienteFila,
} from '../../../core/models/expediente.model';
import type { Plantilla } from '../../../core/models/plantilla.model';
import { AuthService } from '../../../core/services/auth.service';
import {
  ExpedienteService,
  type FiltrosExpediente,
} from '../../../core/services/expediente.service';
import { PlantillaService, SeleccionService } from '../../../core/services/plantilla.service';
import { BadgeEtapa } from '../../../shared/badge-etapa/badge-etapa';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ValidacionExpediente } from '../../validacion/validacion-expediente';

@Component({
  selector: 'app-lista-expedientes',
  imports: [
    BadgeEtapa,
    ConfirmDialog,
    DatePicker,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    Menu,
    Toast,
    ValidacionExpediente,
  ],
  templateUrl: './lista.html',
  styleUrl: './lista.scss',
})
export class ListaExpedientes implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly seleccionService = inject(SeleccionService);
  private readonly mensajes = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private cargaActual?: Subscription;

  protected readonly filas = signal<ExpedienteFila[]>([]);
  protected readonly cargando = signal(false);
  protected readonly total = signal(0);
  protected readonly primeraFila = signal(0);
  protected readonly errorCarga = signal(false);
  protected readonly opcionesFila = signal<MenuItem[]>([]);
  protected readonly paginaActual = computed(() => Math.floor(this.primeraFila() / 5) + 1);
  protected readonly ultimaPagina = computed(() => Math.max(1, Math.ceil(this.total() / 5)));
  protected readonly paginas = computed(() => {
    const inicio = Math.max(1, Math.min(this.paginaActual() - 1, this.ultimaPagina() - 2));
    return Array.from({ length: Math.min(3, this.ultimaPagina()) }, (_, i) => inicio + i);
  });

  // HU-41 — selección vigente de plantillas (solo administrador).
  protected readonly plantillasCarta = signal<Plantilla[]>([]);
  protected readonly plantillasResolucion = signal<Plantilla[]>([]);
  protected readonly actualizandoPlantillas = signal(false);
  protected readonly seleccionCartaId = signal<number | null>(null);
  protected readonly seleccionResolucionId = signal<number | null>(null);

  protected readonly esSecretariaOAdmin = computed(() =>
    ['SECRETARIA', 'ADMINISTRADOR_GENERAL'].includes(this.auth.usuarioActual()?.rol_codigo ?? ''),
  );

  protected readonly esAdmin = computed(
    () => this.auth.usuarioActual()?.rol_codigo === 'ADMINISTRADOR_GENERAL',
  );

  protected readonly opcionesEstado = ESTADOS_EXPEDIENTE.map((estado) => ({
    label: ESTADO_INFO[estado].label,
    value: estado,
  }));

  protected readonly filtroForm = this.fb.group({
    busqueda: [''],
    estado: [null as EstadoExpediente | null],
    desde: [null as Date | null],
    hasta: [null as Date | null],
  });

  private filtrosAplicados: FiltrosExpediente = {};

  ngOnInit(): void {
    if (this.esAdmin()) this.cargarSeleccionPlantillas();
    this.filtroForm.controls.busqueda.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());
    this.destroyRef.onDestroy(() => this.cargaActual?.unsubscribe());
    this.cargar(1);
  }

  // HU-41 — plantillas activas por tipo + selección vigente (solo admin).
  private cargarSeleccionPlantillas(): void {
    const usuarioId = this.auth.usuarioActual()?.id;
    if (usuarioId === undefined) return;
    const cache = this.seleccionService.catalogo();
    if (cache?.usuarioId === usuarioId) {
      this.plantillasCarta.set(cache.cartas);
      this.plantillasResolucion.set(cache.resoluciones);
      this.seleccionCartaId.set(cache.cartaId);
      this.seleccionResolucionId.set(cache.resolucionId);
    }
    this.actualizandoPlantillas.set(true);
    forkJoin({ plantillas: this.plantillaService.listar(), selecciones: this.seleccionService.listarVigentes() })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ plantillas, selecciones }) => {
          const cartas = plantillas.filter(p => p.estado === 'ACTIVO' && p.tipo_documento?.codigo === 'CARTA');
          const resoluciones = plantillas.filter(p => p.estado === 'ACTIVO' && p.tipo_documento?.codigo === 'RESOLUCION');
          const cartaId = selecciones.find(s => s.tipo_documento?.codigo === 'CARTA')?.plantilla?.id ?? null;
          const resolucionId = selecciones.find(s => s.tipo_documento?.codigo === 'RESOLUCION')?.plantilla?.id ?? null;
          this.plantillasCarta.set(cartas);
          this.plantillasResolucion.set(resoluciones);
          this.seleccionCartaId.set(cartaId);
          this.seleccionResolucionId.set(resolucionId);
          this.seleccionService.catalogo.set({ usuarioId, cartas, resoluciones, cartaId, resolucionId });
          this.actualizandoPlantillas.set(false);
        },
        error: () => {
          this.actualizandoPlantillas.set(false);
          this.mensajes.add({ severity: 'warn', summary: 'Plantillas no actualizadas', detail: 'No se pudo consultar la selección vigente. Vuelve a intentar recargando la lista.' });
        },
      });
  }

  protected alCambiarPlantilla(tipoDocumentoId: number, plantillaId: number | null): void {
    if (plantillaId === null || this.actualizandoPlantillas()) {
      return;
    }
    const anterior = tipoDocumentoId === 1 ? this.seleccionCartaId() : this.seleccionResolucionId();
    if (tipoDocumentoId === 1) this.seleccionCartaId.set(plantillaId);
    else this.seleccionResolucionId.set(plantillaId);
    this.actualizandoPlantillas.set(true);
    this.seleccionService
      .seleccionar({
        modulo: 'ARTICULOS',
        tipo_documento_id: tipoDocumentoId,
        plantilla_id: plantillaId,
      })
      .subscribe({
        next: () => {
          if (tipoDocumentoId === 1) this.seleccionCartaId.set(plantillaId);
          else this.seleccionResolucionId.set(plantillaId);
          this.seleccionService.catalogo.update(cache => cache ? { ...cache, cartaId: this.seleccionCartaId(), resolucionId: this.seleccionResolucionId() } : null);
          this.actualizandoPlantillas.set(false);
          this.mensajes.add({
            severity: 'success',
            summary: 'Plantilla seleccionada',
            detail: 'La selección vigente se actualizó (RN-13).',
          });
        },
        error: (error) => {
          if (tipoDocumentoId === 1) this.seleccionCartaId.set(anterior);
          else this.seleccionResolucionId.set(anterior);
          this.actualizandoPlantillas.set(false);
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

  protected cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.ultimaPagina() || this.cargando()) return;
    this.primeraFila.set((pagina - 1) * 5);
    this.cargar(pagina);
  }

  protected abrirOpciones(event: Event, fila: ExpedienteFila, menu: Menu): void {
    event.stopPropagation();
    this.opcionesFila.set([
      { label: 'Modificar', icon: 'pi pi-pencil', command: () => this.editarFila(fila) },
      { label: 'Eliminar', icon: 'pi pi-times', command: () => this.confirmarEliminar(fila) },
    ]);
    menu.toggle(event);
  }

  protected iniciales(nombre: string | null): string {
    return (
      (nombre ?? '')
        .replace(/^(dr\.?|dra\.?|mg\.?|lic\.?)\s+/i, '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase() || '—'
    );
  }

  protected fechaCorta(fecha: string): string {
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
    if (!partes) return fecha;
    const meses = [
      'ene.',
      'feb.',
      'mar.',
      'abr.',
      'may.',
      'jun.',
      'jul.',
      'ago.',
      'sep.',
      'oct.',
      'nov.',
      'dic.',
    ];
    return `${partes[1]} ${meses[Number(partes[2]) - 1]} ${partes[3]}`;
  }

  protected aplicarFiltros(): void {
    const valores = this.filtroForm.getRawValue();
    this.filtrosAplicados = {
      busqueda: valores.busqueda?.trim() || undefined,
      estado: valores.estado ?? undefined,
      desde: this.fechaIso(valores.desde),
      hasta: this.fechaIso(valores.hasta),
    };
    this.primeraFila.set(0);
    this.cargar(1);
  }

  protected limpiarFiltros(): void {
    this.filtroForm.reset(
      { busqueda: '', estado: null, desde: null, hasta: null },
      { emitEvent: false },
    );
    this.filtrosAplicados = {};
    this.primeraFila.set(0);
    this.cargar(1);
  }

  protected hayFiltros(): boolean {
    return Boolean(
      this.filtrosAplicados.busqueda ||
      this.filtrosAplicados.estado ||
      this.filtrosAplicados.desde ||
      this.filtrosAplicados.hasta,
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
            const pagina = Math.min(
              this.paginaActual(),
              Math.max(1, Math.ceil((this.total() - 1) / 5)),
            );
            this.primeraFila.set((pagina - 1) * 5);
            this.cargar(pagina);
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

  protected ejecutarAccion(fila: ExpedienteFila): void {
    if (fila.accion_principal.clave === 'validar') {
      this.abrirValidacion(fila);
    } else if (fila.accion_principal.clave === 'generar_carta') {
      this.router.navigate(['/expedientes', fila.id], { queryParams: { paso: 1 } });
    } else {
      this.navegar(fila);
    }
  }

  protected readonly dialogoValidacion = signal(false);
  protected readonly expedienteValidar = signal<any>(null); // We fetch the full detail

  private abrirValidacion(fila: ExpedienteFila): void {
    this.cargando.set(true);
    this.expedienteService.obtener(fila.id).subscribe({
      next: (detalle) => {
        this.expedienteValidar.set(detalle);
        this.cargando.set(false);
        this.dialogoValidacion.set(true);
      },
      error: () => {
        this.cargando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el expediente para validación.',
        });
      },
    });
  }

  protected alValidado(): void {
    this.dialogoValidacion.set(false);
    this.cargar(Math.floor(this.primeraFila() / 5) + 1);
  }

  protected cargar(pagina: number): void {
    this.cargaActual?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.cargaActual = this.expedienteService.listar(this.filtrosAplicados, pagina).subscribe({
      next: (respuesta) => {
        this.filas.set(respuesta.data);
        this.total.set(respuesta.meta.total);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.errorCarga.set(true);
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
