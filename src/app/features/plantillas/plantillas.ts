import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';

import type { Plantilla } from '../../core/models/plantilla.model';
import { DevAuthService } from '../../core/services/dev-auth.service';
import { PlantillaService } from '../../core/services/plantilla.service';

const TIPOS = [
  { id: 1, codigo: 'CARTA', nombre: 'Carta VRIN → OPP' },
  { id: 2, codigo: 'RESOLUCION', nombre: 'Resolución VRIN' },
];

const MAX_TAMANO = 25 * 1024 * 1024;

@Component({
  selector: 'app-plantillas',
  imports: [Button, Dialog, InputText, ReactiveFormsModule, RouterLink, Select, TableModule, Tag, Toast],
  templateUrl: './plantillas.html',
  styleUrl: './plantillas.scss',
})
export class Plantillas implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(DevAuthService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly mensajes = inject(MessageService);

  protected readonly plantillas = signal<Plantilla[]>([]);
  protected readonly cargando = signal(true);
  protected readonly dialogoSubida = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly archivoSeleccionado = signal<File | null>(null);

  protected readonly tipos = TIPOS;
  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol === 'ADMINISTRADOR');

  protected readonly formulario = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    tipo_documento_id: [null as number | null, Validators.required],
  });

  ngOnInit(): void {
    this.auth.cargarUsuarioActual().subscribe();
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.plantillaService.listar().subscribe({
      next: (plantillas) => {
        this.plantillas.set(plantillas);
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
