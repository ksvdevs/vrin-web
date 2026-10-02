import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';

import { Rol } from '../../core/models/rol.model';
import { RolPayload, RolService } from '../../core/services/rol.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    Button,
    ConfirmDialog,
    DatePipe,
    Dialog,
    FormsModule,
    InputText,
    ReactiveFormsModule,
    Select,
    TableModule,
    Tag,
    Textarea,
    Toast,
  ],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rolService = inject(RolService);
  private readonly mensajes = inject(MessageService);
  private readonly confirmacion = inject(ConfirmationService);

  protected readonly roles = signal<Rol[]>([]);
  protected readonly cargando = signal(true);

  protected registrosPorPagina = 5;
  protected readonly opcionesRegistro = [5, 10, 20].map((n) => ({ label: String(n), value: n }));
  protected readonly opcionesEstado = [
    { label: 'Activo/Inactivo', value: null },
    { label: 'Activo', value: 1 },
    { label: 'Inactivo', value: 0 },
  ];
  protected filtroNombre = '';
  protected filtroEstado: number | null = null;

  protected readonly dialogoVisible = signal(false);
  protected readonly rolEnEdicion = signal<Rol | null>(null);
  protected readonly guardando = signal(false);

  protected readonly formulario = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    activo: [true, Validators.required],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.rolService
      .listar({
        nombre: this.filtroNombre.trim() || undefined,
        activo: this.filtroEstado ?? undefined,
      })
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'Sin conexión',
            detail: 'No se pudo obtener la lista de roles.',
          });
        },
      });
  }

  protected limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroEstado = null;
    this.cargar();
  }

  protected abrirNuevo(): void {
    this.rolEnEdicion.set(null);
    this.formulario.reset({ nombre: '', descripcion: '', activo: true });
    this.dialogoVisible.set(true);
  }

  protected abrirEdicion(rol: Rol): void {
    this.rolEnEdicion.set(rol);
    this.formulario.reset({
      nombre: rol.nombre,
      descripcion: rol.descripcion ?? '',
      activo: rol.activo,
    });
    this.dialogoVisible.set(true);
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    const payload: RolPayload = {
      nombre: (valores.nombre ?? '').trim(),
      descripcion: valores.descripcion?.trim() || null,
      activo: valores.activo ?? true,
    };

    const enEdicion = this.rolEnEdicion();
    this.guardando.set(true);
    const peticion = enEdicion
      ? this.rolService.actualizar(enEdicion.id, payload)
      : this.rolService.crear(payload);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogoVisible.set(false);
        this.mensajes.add({
          severity: 'success',
          summary: enEdicion ? 'Rol actualizado' : 'Rol registrado',
          detail: payload.nombre,
        });
        this.cargar();
      },
      error: (error) => {
        this.guardando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: this.detalleError(error),
        });
      },
    });
  }

  protected confirmarEliminar(rol: Rol): void {
    this.confirmacion.confirm({
      header: 'Eliminar rol',
      message: `¿Estás seguro de eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.rolService.eliminar(rol.id).subscribe({
          next: () => {
            this.mensajes.add({
              severity: 'success',
              summary: 'Rol eliminado',
              detail: rol.nombre,
            });
            this.cargar();
          },
          error: (error) => {
            this.mensajes.add({
              severity: 'error',
              summary: 'No se pudo eliminar',
              detail: this.detalleError(error),
            });
          },
        });
      },
    });
  }

  private detalleError(error: unknown): string {
    const mensaje = (error as { error?: { message?: string } })?.error?.message;
    return mensaje ?? 'Ocurrió un error inesperado.';
  }
}
