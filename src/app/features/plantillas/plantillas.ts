import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';

import type { Plantilla, TipoDocumento } from '../../core/models/plantilla.model';
import { AuthService } from '../../core/services/auth.service';
import { PlantillaService, SeleccionService } from '../../core/services/plantilla.service';

const MAX_TAMANO = 25 * 1024 * 1024;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plantillas',
  imports: [Button, ConfirmDialog, DatePipe, DatePicker, Dialog, FormsModule, InputText, ReactiveFormsModule, RouterLink, Select, TableModule, Tag, Toast],
  templateUrl: './plantillas.html',
  styleUrl: './plantillas.scss',
})
export class Plantillas implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly seleccionService = inject(SeleccionService);
  private readonly mensajes = inject(MessageService);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cambiosBusqueda = new Subject<string>();
  private ultimaCarga = 0;

  protected readonly plantillas = signal<Plantilla[]>([]);
  protected readonly cargando = signal(true);
  protected readonly total = signal(0);
  protected readonly registrosPorPagina = 15;
  protected primeraFila = 0;
  protected readonly opcionesEstado = [
    { label: 'Todos', value: null },
    { label: 'Activa', value: 'ACTIVO' },
    { label: 'Inactiva', value: 'INACTIVO' },
  ];
  protected readonly filtroBusqueda = signal('');
  protected readonly filtroEstado = signal<'ACTIVO' | 'INACTIVO' | null>(null);
  protected readonly filtroDesde = signal<Date | null>(null);
  protected readonly filtroHasta = signal<Date | null>(null);
  protected readonly dialogoSubida = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly archivoSeleccionado = signal<File | null>(null);
  protected readonly dialogoEdicion = signal(false);
  protected readonly editando = signal(false);
  protected readonly plantillaEnEdicion = signal<Plantilla | null>(null);

  protected readonly tipos = signal<TipoDocumento[]>([]);
  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol_codigo === 'ADMINISTRADOR_GENERAL');

  protected readonly formulario = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    tipo_documento_id: [null as number | null, Validators.required],
  });
  protected readonly formularioEdicion = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.auth.verificarSesion().subscribe();
    this.plantillaService.listarTipos().subscribe({
      next: (tipos) => this.tipos.set(tipos),
      error: () => this.mensajes.add({
        severity: 'error',
        summary: 'Sin conexión',
        detail: 'No se pudo obtener los tipos de documento.',
      }),
    });
    this.cambiosBusqueda
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reiniciarPagina());
    this.cargar(1);
  }

  protected alBuscar(termino: string): void {
    this.filtroBusqueda.set(termino);
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
    return `Mostrando ${this.plantillas().length} de ${this.total()} plantillas`;
  }

  private fechaLocal(fecha: Date | null): string | null {
    if (!fecha) return null;
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  protected cargar(pagina = 1): void {
    const carga = ++this.ultimaCarga;
    this.primeraFila = (pagina - 1) * this.registrosPorPagina;
    this.cargando.set(true);
    this.plantillaService
      .listar(
        {
          busqueda: this.filtroBusqueda().trim() || undefined,
          estado: this.filtroEstado() ?? undefined,
          desde: this.fechaLocal(this.filtroDesde()) ?? undefined,
          hasta: this.fechaLocal(this.filtroHasta()) ?? undefined,
        },
        pagina,
        this.registrosPorPagina,
      )
      .subscribe({
        next: (respuesta) => {
          if (carga !== this.ultimaCarga) return;
          this.plantillas.set(respuesta.data);
          this.total.set(respuesta.total);
          this.cargando.set(false);
          const ultimaPagina = Math.max(1, Math.ceil(respuesta.total / this.registrosPorPagina));
          if (pagina > ultimaPagina) this.cargar(ultimaPagina);
        },
        error: () => {
          if (carga !== this.ultimaCarga) return;
          this.cargando.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'Sin conexión',
            detail: 'No se pudo obtener el listado de plantillas.',
          });
        },
      });
  }

  protected seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    this.archivoSeleccionado.set(null);
    if (!archivo) {
      return;
    }
    const esDocx = archivo.name.toLowerCase().endsWith('.docx');
    if (!esDocx) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Archivo no permitido',
        detail: 'La plantilla debe ser un archivo .docx.',
      });
      return;
    }
    if (archivo.size > MAX_TAMANO) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Archivo muy grande',
        detail: 'La plantilla no puede superar los 25 MB.',
      });
      return;
    }
    this.archivoSeleccionado.set(archivo);
  }

  protected abrirSubida(): void {
    this.formulario.reset({
      nombre: '',
      tipo_documento_id: null,
    });
    this.archivoSeleccionado.set(null);
    this.dialogoSubida.set(true);
  }

  protected abrirEdicion(plantilla: Plantilla): void {
    this.plantillaEnEdicion.set(plantilla);
    this.formularioEdicion.reset({ nombre: plantilla.nombre });
    this.dialogoEdicion.set(true);
  }

  protected guardarEdicion(): void {
    const plantilla = this.plantillaEnEdicion();
    const nombre = this.formularioEdicion.controls.nombre.value?.trim() ?? '';
    if (!plantilla || this.editando()) return;
    if (this.formularioEdicion.invalid || nombre === '') {
      this.formularioEdicion.controls.nombre.setErrors({ required: true });
      this.formularioEdicion.markAllAsTouched();
      return;
    }

    this.editando.set(true);
    this.plantillaService.actualizarNombre(plantilla.id, nombre).subscribe({
      next: () => {
        this.editando.set(false);
        this.dialogoEdicion.set(false);
        this.plantillaEnEdicion.set(null);
        this.seleccionService.catalogo.set(null);
        this.mensajes.add({ severity: 'success', summary: 'Nombre actualizado', detail: plantilla.codigo });
        this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
      },
      error: (error) => {
        this.editando.set(false);
        this.mensajes.add({ severity: 'error', summary: 'No se pudo editar', detail: this.detalleError(error, 'nombre') });
      },
    });
  }

  protected confirmarEliminar(plantilla: Plantilla): void {
    this.confirmacion.confirm({
      header: 'Eliminar plantilla',
      message: `¿Eliminar ${plantilla.codigo}? Se quitará del listado, pero los documentos históricos se conservarán.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(plantilla),
    });
  }

  private eliminar(plantilla: Plantilla): void {
    this.plantillaService.eliminar(plantilla.id).subscribe({
      next: () => {
        this.seleccionService.catalogo.set(null);
        this.mensajes.add({ severity: 'success', summary: 'Plantilla eliminada', detail: plantilla.codigo });
        this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
      },
      error: (error) => this.mensajes.add({
        severity: 'error', summary: 'No se pudo eliminar', detail: this.detalleError(error, 'estado'),
      }),
    });
  }

  private detalleError(error: unknown, campo: 'nombre' | 'estado'): string {
    const respuesta = (error as { error?: { errors?: Record<string, string[]>; message?: string } })?.error;
    return respuesta?.errors?.[campo]?.[0] ?? respuesta?.message ?? 'Ocurrió un error inesperado.';
  }

  protected subir(): void {
    const archivo = this.archivoSeleccionado();
    const valores = this.formulario.getRawValue();
    if (this.formulario.invalid || !archivo || this.subiendo()) {
      this.formulario.markAllAsTouched();
      if (!archivo) {
        this.mensajes.add({
          severity: 'warn',
          summary: 'Falta el archivo',
          detail: 'Elige el DOCX de la plantilla.',
        });
      }
      return;
    }
    this.subiendo.set(true);
    this.plantillaService
      .subir({
        nombre: (valores.nombre ?? '').trim(),
        tipo_documento_id: valores.tipo_documento_id ?? 0,
        archivo,
      })
      .subscribe({
        next: (plantilla) => {
          this.subiendo.set(false);
          this.dialogoSubida.set(false);
          this.seleccionService.catalogo.set(null);
          this.formulario.reset({ nombre: '', tipo_documento_id: null });
          this.archivoSeleccionado.set(null);
          this.mensajes.add({
            severity: 'success',
            summary: 'Plantilla subida',
            detail: `${plantilla.codigo} · versión ${plantilla.version} · ${plantilla.tokens_count} tokens indexados.`,
          });
          if (plantilla.sin_mapeo.length > 0) {
            this.mensajes.add({
              severity: 'warn',
              summary: 'Tokens sin mapeo conocido',
              detail: plantilla.sin_mapeo.join(', '),
              life: 8000,
            });
          }
          this.cargar();
        },
        error: (error) => {
          this.subiendo.set(false);
          const respuesta = (error as { error?: { errors?: Record<string, string[]>; message?: string } })?.error;
          this.mensajes.add({
            severity: 'error',
            summary: 'No se pudo subir la plantilla',
            detail: respuesta?.errors?.['archivo']?.[0] ?? respuesta?.errors?.['nombre']?.[0] ??
              respuesta?.errors?.['tipo_documento_id']?.[0] ?? respuesta?.message ?? 'Ocurrió un error inesperado.',
          });
        },
      });
  }

  protected alternarEstado(plantilla: Plantilla): void {
    const nuevoEstado = plantilla.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.plantillaService.cambiarEstado(plantilla.id, nuevoEstado).subscribe({
      next: () => {
        this.seleccionService.catalogo.set(null);
        this.mensajes.add({
          severity: 'success',
          summary: nuevoEstado === 'ACTIVO' ? 'Plantilla activada' : 'Plantilla desactivada',
          detail: `${plantilla.codigo} · versión ${plantilla.version}`,
        });
        this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
      },
      error: (error) => {
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo cambiar el estado',
          detail:
            (error as { error?: { errors?: { estado?: string[] }; message?: string } })?.error?.errors?.estado?.[0] ??
            (error as { error?: { message?: string } })?.error?.message ??
            'Ocurrió un error inesperado.',
        });
      },
    });
  }
}
