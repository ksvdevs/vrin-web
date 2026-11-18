import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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

import { CATEGORIAS, Docente, GENEROS } from '../../../core/models/docente.model';
import { Escuela } from '../../../core/models/escuela.model';
import { Facultad } from '../../../core/models/facultad.model';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { DocenteService } from '../../../core/services/docente.service';
import { DocenteFormulario } from '../../../shared/docente-formulario/docente-formulario';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-docentes',
  imports: [
    Button,
    ConfirmDialog,
    DatePipe,
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
  private readonly catalogoService = inject(CatalogoService);
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
  protected readonly filtroGenero = signal<string | null>(null);
  protected readonly filtroCarrera = signal<number | null>(null);
  protected readonly facultades = signal<Facultad[]>([]);
  protected readonly opcionesEstado = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];
  protected readonly opcionesCategoria = [
    { label: 'Todos', value: null },
    ...CATEGORIAS.map((categoria) => ({ label: categoria.replaceAll('_', ' '), value: categoria })),
  ];
  protected readonly opcionesGenero = [
    { label: 'Todos', value: null },
    ...GENEROS.map((genero) => ({ label: genero.charAt(0) + genero.slice(1).toLowerCase(), value: genero })),
  ];
  protected readonly opcionesCarrera = computed(() => [
    { label: 'Todas', value: null as number | null },
    ...this.facultades().flatMap((facultad) =>
      (facultad.escuelas ?? []).map((escuela: Escuela) => ({
        label: `${escuela.nombre} (${facultad.nombre})`, value: escuela.id,
      })),
    ),
  ]);
  protected readonly registrosPorPagina = 15;
  protected primeraFila = 0;

  protected readonly dialogoVisible = signal(false);
  protected readonly docenteEnEdicion = signal<Docente | null>(null);

  ngOnInit(): void {
    this.auth.verificarSesion().subscribe();
    this.catalogoService.listarFacultades().subscribe({
      next: (facultades) => this.facultades.set(facultades),
      error: () => this.mensajes.add({
        severity: 'error', summary: 'Sin conexión', detail: 'No se pudo obtener el catálogo de carreras.',
      }),
    });
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
    if (this.docenteEnEdicion() === null) {
      this.busqueda.set('');
      this.filtroEstado.set(null);
      this.filtroCategoria.set(null);
      this.filtroGenero.set(null);
      this.filtroCarrera.set(null);
      this.primeraFila = 0;
      this.cargar(1);
      return;
    }
    this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
  }

  protected nombreEscuela(docente: Docente): string {
    const facultad = docente.escuela?.facultad?.nombre;
    const escuela = docente.escuela?.nombre ?? '—';
    return facultad ? `${escuela} (${facultad})` : escuela;
  }

  protected nombreCompleto(docente: Docente): string {
    return [docente.nombres, docente.apellido_paterno, docente.apellido_materno].filter(Boolean).join(' ');
  }

  protected nombreCategoria(docente: Docente): string {
    const nombres: Record<string, string> = {
      ORDINARIO_PRINCIPAL: 'Ordinario/Principal',
      ORDINARIO_ASOCIADO: 'Ordinario/Asociado',
      ORDINARIO_AUXILIAR: 'Ordinario/Auxiliar',
      CONTRATADO: 'Contratado',
    };
    return docente.categoria ? nombres[docente.categoria] ?? docente.categoria : '—';
  }

  protected apellidos(docente: Docente): string {
    return [docente.apellido_paterno, docente.apellido_materno].filter(Boolean).join(' ');
  }

  protected confirmarEliminar(docente: Docente): void {
    this.confirmacion.confirm({
      header: 'Eliminar docente',
      message: `¿Eliminar permanentemente a ${this.apellidos(docente)}, ${docente.nombres}? Si tiene expedientes, desactívalo desde Modificar docente.`,
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
          genero: this.filtroGenero() ?? undefined,
          escuela_id: this.filtroCarrera() ?? undefined,
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
