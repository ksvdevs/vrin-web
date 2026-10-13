import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';

import type { Plantilla } from '../../core/models/plantilla.model';
import { AuthService } from '../../core/services/auth.service';
import { PlantillaService } from '../../core/services/plantilla.service';

const TIPOS = [
  { id: 1, codigo: 'CARTA', nombre: 'Carta VRIN → OPP' },
  { id: 2, codigo: 'RESOLUCION', nombre: 'Resolución VRIN' },
];

const MAX_TAMANO = 25 * 1024 * 1024;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plantillas',
  imports: [Button, DatePipe, DatePicker, Dialog, FormsModule, InputText, ReactiveFormsModule, Select, TableModule, Tag, Toast],
  templateUrl: './plantillas.html',
  styleUrl: './plantillas.scss',
})
export class Plantillas implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly mensajes = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cambiosBusqueda = new Subject<string>();

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

  protected readonly tipos = TIPOS;
  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol_codigo === 'ADMINISTRADOR_GENERAL');

  protected readonly formulario = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    tipo_documento_id: [null as number | null, Validators.required],
  });

  ngOnInit(): void {
    this.auth.verificarSesion().subscribe();
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
      )
      .subscribe({
        next: (respuesta) => {
          this.plantillas.set(respuesta.data);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: () => {
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
    if (!archivo) {
      return;
    }
    const esDocx =
      archivo.name.toLowerCase().endsWith('.docx') &&
      (archivo.type === '' ||
        archivo.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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

  protected subir(): void {
    const archivo = this.archivoSeleccionado();
    const valores = this.formulario.getRawValue();
    if (this.formulario.invalid || !archivo) {
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
          this.mensajes.add({
            severity: 'error',
            summary: 'No se pudo subir la plantilla',
            detail:
              (error as { error?: { message?: string } })?.error?.message ??
              'Ocurrió un error inesperado.',
          });
        },
      });
  }

  protected alternarEstado(plantilla: Plantilla): void {
    const nuevoEstado = plantilla.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.plantillaService.cambiarEstado(plantilla.id, nuevoEstado).subscribe({
      next: () => {
        this.mensajes.add({
          severity: 'success',
          summary: nuevoEstado === 'ACTIVO' ? 'Plantilla activada' : 'Plantilla desactivada',
          detail: `${plantilla.codigo} · versión ${plantilla.version}`,
        });
        this.cargar();
      },
      error: (error) => {
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo cambiar el estado',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'Ocurrió un error inesperado.',
        });
      },
    });
  }
}
