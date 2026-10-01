import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';

import {
  Plantilla,
  PlantillaSeleccion,
  TipoDocumentoPlantilla,
} from '../../core/models/plantilla.model';
import { DevAuthService } from '../../core/services/dev-auth.service';
import { PlantillaService } from '../../core/services/plantilla.service';

const MODULO = 'ARTICULOS';
const TAMANO_MAXIMO = 25 * 1024 * 1024;

@Component({
  selector: 'app-plantillas',
  imports: [
    Button,
    Card,
    ConfirmDialog,
    Dialog,
    FormsModule,
    InputText,
    RouterLink,
    Select,
    TableModule,
    Tag,
    Toast,
  ],
  templateUrl: './plantillas.html',
  styleUrl: './plantillas.scss',
})
export class Plantillas implements OnInit {
  protected readonly auth = inject(DevAuthService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly mensajes = inject(MessageService);
  private readonly confirmacion = inject(ConfirmationService);

  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol === 'ADMINISTRADOR');

  protected readonly plantillas = signal<Plantilla[]>([]);
  protected readonly tipos = signal<TipoDocumentoPlantilla[]>([]);
  protected readonly selecciones = signal<PlantillaSeleccion[]>([]);
  protected readonly cargando = signal(true);

  // Modal de subida
  protected readonly dialogoVisible = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly nombreNueva = signal('');
  protected readonly tipoNuevaId = signal<number | null>(null);
  protected readonly archivoNueva = signal<File | null>(null);

  // HU-41: opciones por tipo para los desplegables de selección vigente
  protected readonly opcionesPorTipo = computed(() => {
    const mapa = new Map<number, { label: string; value: number }[]>();
    for (const plantilla of this.plantillas()) {
      if (plantilla.estado !== 'ACTIVO') {
        continue;
      }
      const opciones = mapa.get(plantilla.tipo_documento_id) ?? [];
      opciones.push({
        label: `${plantilla.codigo} — ${plantilla.nombre} (v${plantilla.version})`,
        value: plantilla.id,
      });
      mapa.set(plantilla.tipo_documento_id, opciones);
    }
    return mapa;
  });

  ngOnInit(): void {
    this.auth.cargarUsuarioActual().subscribe();
    this.cargarTodo();
  }

  protected seleccionVigente(tipoId: number): number | null {
    return (
      this.selecciones().find((s) => s.tipo_documento_id === tipoId)?.plantilla_id ?? null
    );
  }

  protected alCambiarSeleccion(tipoId: number, plantillaId: number | null): void {
    if (plantillaId === null) {
      return;
    }
    this.plantillaService
      .seleccionar({ modulo: MODULO, tipo_documento_id: tipoId, plantilla_id: plantillaId })
      .subscribe({
        next: () => {
          this.mensajes.add({
            severity: 'success',
            summary: 'Plantilla vigente actualizada',
            detail: 'La selección quedó registrada para el módulo Artículos.',
          });
          this.cargarSelecciones();
        },
        error: (error) => {
          this.mensajes.add({
            severity: 'error',
            summary: 'No se pudo cambiar la selección',
            detail: this.detalleError(error),
          });
          this.cargarSelecciones();
        },
      });
  }

  protected abrirSubida(): void {
    this.nombreNueva.set('');
    this.tipoNuevaId.set(null);
    this.archivoNueva.set(null);
    this.dialogoVisible.set(true);
  }

  protected seleccionarArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (!archivo) {
      return;
    }
    if (!archivo.name.toLowerCase().endsWith('.docx')) {
      this.mensajes.add({
        severity: 'warn',
        summary: 'Formato no válido',
        detail: 'La plantilla debe ser un archivo .docx.',
      });
      input.value = '';
      return;
    }
    if (archivo.size > TAMANO_MAXIMO) {
      this.mensajes.add({
        severity: 'warn',
        summary: 'Archivo muy grande',
        detail: 'La plantilla no puede superar los 25 MB.',
      });
      input.value = '';
      return;
    }
    this.archivoNueva.set(archivo);
  }

  protected subir(): void {
    const nombre = this.nombreNueva().trim();
    const tipoId = this.tipoNuevaId();
    const archivo = this.archivoNueva();

    if (!nombre || tipoId === null || !archivo || this.subiendo()) {
      return;
    }

    this.subiendo.set(true);
    this.plantillaService.subir(nombre, tipoId, archivo).subscribe({
      next: (respuesta) => {
        this.subiendo.set(false);
        this.dialogoVisible.set(false);
        this.mensajes.add({
          severity: 'success',
          summary: 'Plantilla registrada',
          detail: `${respuesta.plantilla.codigo} (v${respuesta.plantilla.version}) — ${respuesta.tokens.length} tokens indexados.`,
        });
        // RF-43: los tokens sin mapeo conocido se reportan como advertencia.
        if (respuesta.advertencia_tokens_sin_mapeo.length > 0) {
          this.mensajes.add({
            severity: 'warn',
            summary: 'Tokens sin mapeo conocido',
            detail: respuesta.advertencia_tokens_sin_mapeo.join(', '),
            life: 10000,
          });
        }
        this.cargarTodo();
      },
      error: (error) => {
        this.subiendo.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo subir la plantilla',
          detail: this.detalleError(error),
        });
      },
    });
  }

  protected confirmarCambioEstado(plantilla: Plantilla): void {
    const desactivar = plantilla.estado === 'ACTIVO';
    this.confirmacion.confirm({
      header: desactivar ? 'Desactivar plantilla' : 'Activar plantilla',
      message: `¿${desactivar ? 'Desactivar' : 'Activar'} ${plantilla.codigo} — ${plantilla.nombre}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: desactivar ? 'Desactivar' : 'Activar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: desactivar ? 'p-button-danger' : undefined,
      accept: () => this.cambiarEstado(plantilla),
    });
  }

  protected confirmarEliminar(plantilla: Plantilla): void {
    this.confirmacion.confirm({
      header: 'Eliminar plantilla',
      message: `¿Eliminar ${plantilla.codigo} — ${plantilla.nombre}? El retiro es lógico: el archivo se conserva.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(plantilla),
    });
  }

  private cambiarEstado(plantilla: Plantilla): void {
    const estado = plantilla.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.plantillaService.cambiarEstado(plantilla.id, estado).subscribe({
      next: () => {
        this.mensajes.add({
          severity: 'success',
          summary: estado === 'ACTIVO' ? 'Plantilla activada' : 'Plantilla desactivada',
          detail: `${plantilla.codigo} — ${plantilla.nombre}`,
        });
        this.cargarTodo();
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

  private eliminar(plantilla: Plantilla): void {
    this.plantillaService.eliminar(plantilla.id).subscribe({
      next: () => {
        this.mensajes.add({
          severity: 'success',
          summary: 'Plantilla eliminada',
          detail: `${plantilla.codigo} quedó retirada (baja lógica).`,
        });
        this.cargarTodo();
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

  private cargarTodo(): void {
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
          detail: 'No se pudo obtener la lista de plantillas.',
        });
      },
    });
    this.plantillaService.listarTipos().subscribe({
      next: (tipos) => this.tipos.set(tipos),
    });
    this.cargarSelecciones();
  }

  private cargarSelecciones(): void {
    this.plantillaService.listarSeleccion(MODULO).subscribe({
      next: (selecciones) => this.selecciones.set(selecciones),
    });
  }

  private detalleError(error: unknown): string {
    const mensaje = (error as { error?: { message?: string } })?.error?.message;
    return mensaje ?? 'Ocurrió un error inesperado.';
  }
}
