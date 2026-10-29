import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';

import { CATEGORIAS, Docente, GRADOS } from '../../../core/models/docente.model';
import { AuthService } from '../../../core/services/auth.service';
import { DocenteService } from '../../../core/services/docente.service';
import { DocenteFormulario } from '../../../shared/docente-formulario/docente-formulario';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-docentes',
  imports: [
    Button,
    ConfirmDialog,
    DocenteFormulario,
    FormsModule,
    Select,
    TableModule,
    Tag,
    Toast,
  ],
  templateUrl: './docentes.html',
  styleUrl: './docentes.scss',
})
export class Docentes implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly docenteService = inject(DocenteService);
  private readonly mensajes = inject(MessageService);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cambiosBusqueda = new Subject<string>();
  private ultimaCarga = 0;

  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol_codigo === 'ADMINISTRADOR_GENERAL');

  protected readonly docentes = signal<Docente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly total = signal(0);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<boolean | null>(null);
  protected readonly filtroCategoria = signal<string | null>(null);
  protected readonly filtroGrado = signal<string | null>(null);
  protected readonly opcionesEstado = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];
  protected readonly opcionesCategoria = [
    { label: 'Todos', value: null },
    ...CATEGORIAS.map((categoria) => ({ label: categoria.replaceAll('_', ' '), value: categoria })),
  ];
  protected readonly opcionesGrado = [
    { label: 'Todos', value: null },
    ...GRADOS.map((grado) => ({ label: grado, value: grado })),
  ];
  protected readonly registrosPorPagina = 15;
  protected primeraFila = 0;

  protected readonly dialogoVisible = signal(false);
  protected readonly docenteEnEdicion = signal<Docente | null>(null);

  ngOnInit(): void {
    this.auth.verificarSesion().subscribe();
    this.cambiosBusqueda
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reiniciarPagina());
    this.cargar(1);
  }

  protected alBuscar(termino: string): void {
    this.busqueda.set(termino);
    this.cambiosBusqueda.next(termino);
  }

  protected reiniciarPagina(): void {
    this.primeraFila = 0;
    this.cargar(1);
  }

  protected alCambiarPagina(evento: { first?: number | null }): void {
    this.primeraFila = evento.first ?? 0;
    this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
  }

  protected textoPaginacion(): string {
    return `Mostrando ${this.docentes().length} de ${this.total()} docentes`;
  }

  protected abrirNuevo(): void {
    this.docenteEnEdicion.set(null);
    this.dialogoVisible.set(true);
  }

  protected abrirEdicion(docente: Docente): void {
    this.docenteEnEdicion.set(docente);
    this.dialogoVisible.set(true);
  }

  protected alGuardarDocente(): void {
    this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
  }

  protected confirmarCambioEstado(docente: Docente): void {
    const desactivar = docente.activo;
    this.confirmacion.confirm({
      header: desactivar ? 'Desactivar docente' : 'Activar docente',
      message: `¿${desactivar ? 'Desactivar' : 'Activar'} a ${this.apellidos(docente)}, ${docente.nombres}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: desactivar ? 'Desactivar' : 'Activar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: desactivar ? 'p-button-danger' : undefined,
      accept: () => this.cambiarEstado(docente),
    });
  }

  protected nombreEscuela(docente: Docente): string {
    const facultad = docente.escuela?.facultad?.nombre;
    const escuela = docente.escuela?.nombre ?? '—';
    return facultad ? `${escuela} (${facultad})` : escuela;
  }

  protected apellidos(docente: Docente): string {
    return [docente.apellido_paterno, docente.apellido_materno].filter(Boolean).join(' ');
  }

  protected confirmarEliminar(docente: Docente): void {
    this.confirmacion.confirm({
      header: 'Eliminar docente',
      message: `¿Eliminar a ${this.apellidos(docente)}, ${docente.nombres}? Dejará de aparecer en todos los listados.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(docente),
    });
  }

  private eliminar(docente: Docente): void {
    this.docenteService.eliminar(docente.id).subscribe({
      next: () => {
        this.mensajes.add({
          severity: 'success',
          summary: 'Docente eliminado',
          detail: `${this.apellidos(docente)}, ${docente.nombres}`,
        });
        this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
      },
      error: (error) => {
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo eliminar',
          detail: this.detalleError(error),
        });
      },
    });
  }

  private cambiarEstado(docente: Docente): void {
    this.docenteService
      .cambiarEstado(docente.id, !docente.activo)
      .subscribe({
        next: () => {
          this.mensajes.add({
            severity: 'success',
            summary: docente.activo ? 'Docente desactivado' : 'Docente activado',
            detail: `${this.apellidos(docente)}, ${docente.nombres}`,
          });
          this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
        },
        error: (error) => {
          this.mensajes.add({
            severity: 'error',
            summary: 'No se pudo cambiar el estado',
            detail: this.detalleError(error),
          });
        },
      });
  }

  private cargar(pagina: number): void {
    const carga = ++this.ultimaCarga;
    this.cargando.set(true);
    const estado = this.filtroEstado();
    this.docenteService
      .listar(
        {
          busqueda: this.busqueda().trim() || undefined,
          activo: estado === null ? undefined : estado ? 1 : 0,
          categoria: this.filtroCategoria() ?? undefined,
          grado: this.filtroGrado() ?? undefined,
        },
        pagina,
      )
      .subscribe({
        next: (respuesta) => {
          if (carga !== this.ultimaCarga) return;
          this.docentes.set(respuesta.data);
          this.total.set(respuesta.total);
          this.cargando.set(false);
          const ultimaPagina = Math.max(1, Math.ceil(respuesta.total / this.registrosPorPagina));
          if (pagina > ultimaPagina) {
            this.primeraFila = (ultimaPagina - 1) * this.registrosPorPagina;
            this.cargar(ultimaPagina);
          }
        },
        error: () => {
          if (carga !== this.ultimaCarga) return;
          this.cargando.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'Sin conexión',
            detail: 'No se pudo obtener la lista de docentes.',
          });
        },
      });
  }

  private detalleError(error: unknown): string {
    const mensaje = (error as { error?: { message?: string } })?.error?.message;
    return mensaje ?? 'Ocurrió un error inesperado.';
  }
}
