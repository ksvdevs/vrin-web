import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { Rol } from '../../core/models/rol.model';
import { Usuario } from '../../core/models/usuario.model';
import { RolService } from '../../core/services/rol.service';
import { UsuarioPayload, UsuarioService } from '../../core/services/usuario.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    Button,
    ConfirmDialog,
    DatePipe,
    DatePicker,
    Dialog,
    FormsModule,
    InputText,
    ReactiveFormsModule,
    Select,
    TableModule,
    Tag,
    Toast,
    ToggleSwitchModule,
  ],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class Usuarios implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolService = inject(RolService);
  private readonly mensajes = inject(MessageService);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cambiosBusqueda = new Subject<string>();

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly total = signal(0);
  protected readonly roles = signal<Rol[]>([]);

  protected readonly registrosPorPagina = 15;
  protected primeraFila = 0;
  protected readonly opcionesEstado = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: 1 },
    { label: 'Inactivo', value: 0 },
  ];
  protected filtroBusqueda = '';
  protected filtroEstado: number | null = null;
  protected filtroDesde: Date | null = null;
  protected filtroHasta: Date | null = null;

  protected readonly dialogoVisible = signal(false);
  protected readonly detalleVisible = signal(false);
  protected readonly usuarioDetalle = signal<Usuario | null>(null);
  protected readonly usuarioEnEdicion = signal<Usuario | null>(null);
  protected readonly guardando = signal(false);
  protected readonly dniEstado = signal<'disponible' | 'ocupado' | null>(null);
  protected readonly validandoDni = signal(false);

  protected readonly formulario = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rol_id: [null as number | null, Validators.required],
    activo: [true, Validators.required],
  });

  ngOnInit(): void {
    this.cambiosBusqueda.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());
    this.cargar();
    this.rolService.listar({ activo: 1 }).subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => {},
    });
  }

  protected alBuscar(busqueda: string): void {
    this.filtroBusqueda = busqueda;
    this.cambiosBusqueda.next(busqueda);
  }

  protected alCambiarPagina(evento: { first?: number | null }): void {
    this.primeraFila = evento.first ?? 0;
    this.cargar(Math.floor(this.primeraFila / this.registrosPorPagina) + 1);
  }

  protected textoPaginacion(): string {
    return `Mostrando ${this.usuarios().length} de ${this.total()} usuarios`;
  }

  private fechaApi(fecha: Date | null): string | undefined {
    if (!fecha) return undefined;
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  protected cargar(pagina = 1): void {
    this.primeraFila = (pagina - 1) * this.registrosPorPagina;
    this.cargando.set(true);
    this.usuarioService
      .listar(
        {
          busqueda: this.filtroBusqueda.trim() || undefined,
          activo: this.filtroEstado ?? undefined,
          desde: this.fechaApi(this.filtroDesde),
          hasta: this.fechaApi(this.filtroHasta),
        },
        pagina,
      )
      .subscribe({
        next: (respuesta) => {
          this.usuarios.set(respuesta.data);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'Sin conexión',
            detail: 'No se pudo obtener la lista de usuarios.',
          });
        },
      });
  }

  protected abrirNuevo(): void {
    this.usuarioEnEdicion.set(null);
    this.formulario.controls.password.setValidators(Validators.required);
    this.formulario.reset({ dni: '', nombres: '', apellidos: '', email: '', password: '', rol_id: null, activo: true });
    this.dniEstado.set(null);
    this.dialogoVisible.set(true);
  }

  protected abrirEdicion(usuario: Usuario): void {
    this.usuarioEnEdicion.set(usuario);
    this.formulario.controls.password.clearValidators();
    this.formulario.reset({
      dni: usuario.dni,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      email: usuario.email,
      password: '',
      rol_id: usuario.rol_id,
      activo: usuario.activo,
    });
    this.dniEstado.set(null);
    this.dialogoVisible.set(true);
  }

  protected abrirDetalle(usuario: Usuario): void {
    this.usuarioDetalle.set(usuario);
    this.detalleVisible.set(true);
  }

  protected validarDni(): void {
    const dni = (this.formulario.controls.dni.value ?? '').trim();
    if (!/^\d{8}$/.test(dni)) {
      this.dniEstado.set(null);
      this.mensajes.add({
        severity: 'warn',
        summary: 'DNI inválido',
        detail: 'Ingresa un DNI de 8 dígitos para validar.',
      });
      return;
    }
    if (this.usuarioEnEdicion()?.dni === dni) {
      this.dniEstado.set('disponible');
      return;
    }
    this.validandoDni.set(true);
    this.usuarioService.validarDni(dni).subscribe({
      next: (respuesta) => {
        this.validandoDni.set(false);
        this.dniEstado.set(respuesta.disponible ? 'disponible' : 'ocupado');
      },
      error: () => {
        this.validandoDni.set(false);
        this.dniEstado.set(null);
        this.mensajes.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo validar el DNI.',
        });
      },
    });
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    const payload: UsuarioPayload = {
      dni: (valores.dni ?? '').trim(),
      nombres: (valores.nombres ?? '').trim(),
      apellidos: (valores.apellidos ?? '').trim(),
      email: (valores.email ?? '').trim(),
      rol_id: valores.rol_id ?? 0,
      activo: valores.activo ?? true,
    };
    if ((valores.password ?? '').trim()) {
      payload.password = (valores.password ?? '').trim();
    }

    const enEdicion = this.usuarioEnEdicion();
    this.guardando.set(true);
    const peticion = enEdicion
      ? this.usuarioService.actualizar(enEdicion.id, payload)
      : this.usuarioService.crear(payload);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogoVisible.set(false);
        this.mensajes.add({
          severity: 'success',
          summary: enEdicion ? 'Usuario actualizado' : 'Usuario registrado',
          detail: `${payload.apellidos}, ${payload.nombres}`,
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

  protected confirmarEliminar(usuario: Usuario): void {
    this.confirmacion.confirm({
      header: 'Eliminar usuario',
      message: `¿Estás seguro de eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.usuarioService.eliminar(usuario.id).subscribe({
          next: () => {
            this.mensajes.add({
              severity: 'success',
              summary: 'Usuario eliminado',
              detail: usuario.nombre,
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

  protected nombreRol(usuario: Usuario): string {
    return usuario.rol || '—';
  }

  private detalleError(error: unknown): string {
    const mensaje = (error as { error?: { message?: string } })?.error?.message;
    return mensaje ?? 'Ocurrió un error inesperado.';
  }
}
