import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import {
  Docente,
  DocentePayload,
  GRADOS,
  Grado,
  TIPOS_CONTRATO,
  TipoContrato,
} from '../../core/models/docente.model';
import { Escuela } from '../../core/models/escuela.model';
import { Facultad } from '../../core/models/facultad.model';
import { CatalogoService } from '../../core/services/catalogo.service';
import { AuthService } from '../../core/services/auth.service';
import { DocenteService } from '../../core/services/docente.service';
import {
  OpcionAltaInline,
  SelectConAltaInline,
} from '../select-con-alta-inline/select-con-alta-inline';

@Component({
  selector: 'app-docente-formulario',
  imports: [Button, Dialog, InputText, ReactiveFormsModule, Select, SelectConAltaInline],
  templateUrl: './docente-formulario.html',
  styleUrl: './docente-formulario.scss',
})
export class DocenteFormulario implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly docenteService = inject(DocenteService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly mensajes = inject(MessageService);

  readonly visible = model(false);
  readonly docente = input<Docente | null>(null);
  readonly guardado = output<Docente>();

  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol_codigo === 'ADMINISTRADOR_GENERAL');

  protected readonly facultades = signal<Facultad[]>([]);
  protected readonly guardando = signal(false);

  protected readonly grados = GRADOS.map((g) => ({ label: g, value: g }));
  protected readonly tiposContrato = TIPOS_CONTRATO.map((t) => ({
    label: t === 'NOMBRADO' ? 'Nombrado' : 'Contratado',
    value: t,
  }));

  protected readonly formulario = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    nombres: ['', Validators.required],
    apellido_paterno: ['', Validators.required],
    apellido_materno: [''],
    grado: [null as Grado | null, Validators.required],
    tipo_contrato: [null as TipoContrato | null, Validators.required],
    facultad_id: [null as number | null, Validators.required],
    escuela_id: [{ value: null as number | null, disabled: true }, Validators.required],
    email: ['', Validators.email],
  });

  protected readonly facultadSeleccionadaId = signal<number | null>(null);

  protected readonly escuelasDisponibles = computed<Escuela[]>(() => {
    const facultadId = this.facultadSeleccionadaId();
    if (facultadId === null) {
      return [];
    }
    return this.facultades().find((f) => f.id === facultadId)?.escuelas ?? [];
  });

  protected readonly crearFacultad = (nombre: string) =>
    this.catalogoService.crearFacultad({ nombre });

  protected readonly crearEscuela = (nombre: string) =>
    this.catalogoService.crearEscuela({
      facultad_id: this.formulario.getRawValue().facultad_id ?? 0,
      nombre,
    });

  private suscripcionFacultad?: Subscription;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.prepararFormulario(this.docente());
      }
    });
  }

  ngOnInit(): void {
    this.catalogoService.listarFacultades().subscribe({
      next: (facultades) => this.facultades.set(facultades),
      error: () =>
        this.mensajes.add({
          severity: 'error',
          summary: 'Sin conexión',
          detail: 'No se pudo obtener el catálogo de facultades.',
        }),
    });

    this.suscripcionFacultad = this.formulario.controls.facultad_id.valueChanges.subscribe(
      (facultadId) => {
        this.facultadSeleccionadaId.set(facultadId);
        const control = this.formulario.controls.escuela_id;
        control.reset(null);
        if (facultadId === null) {
          control.disable({ emitEvent: false });
        } else {
          control.enable({ emitEvent: false });
        }
      },
    );
  }

  ngOnDestroy(): void {
    this.suscripcionFacultad?.unsubscribe();
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    const payload: DocentePayload = {
      dni: valores.dni ?? '',
      nombres: valores.nombres ?? '',
      apellido_paterno: valores.apellido_paterno ?? '',
      apellido_materno: valores.apellido_materno?.trim() || null,
      grado: valores.grado as Grado,
      tipo_contrato: valores.tipo_contrato as TipoContrato,
      escuela_id: valores.escuela_id ?? 0,
      email: valores.email?.trim() || null,
    };
    const enEdicion = this.docente();
    this.guardando.set(true);
    const peticion = enEdicion
      ? this.docenteService.actualizar(enEdicion.id, { ...payload, activo: enEdicion.activo })
      : this.docenteService.crear(payload);
    peticion.subscribe({
      next: (docenteGuardado) => {
        this.guardando.set(false);
        this.visible.set(false);
        this.mensajes.add({
          severity: 'success',
          summary: enEdicion ? 'Docente actualizado' : 'Docente registrado',
          detail: `${payload.apellido_paterno}, ${payload.nombres}`,
        });
        this.guardado.emit(docenteGuardado);
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

  protected alCrearFacultad(opcion: OpcionAltaInline): void {
    this.facultades.update((lista) =>
      lista.some((f) => f.id === opcion.id)
        ? lista
        : [...lista, { id: opcion.id, nombre: opcion.nombre, escuelas: [] }],
    );
  }

  protected alCrearEscuela(opcion: OpcionAltaInline): void {
    const facultadId = this.formulario.getRawValue().facultad_id;
    if (facultadId === null) {
      return;
    }
    this.facultades.update((lista) =>
      lista.map((f) =>
        f.id === facultadId && !(f.escuelas ?? []).some((e) => e.id === opcion.id)
          ? { ...f, escuelas: [...(f.escuelas ?? []), { id: opcion.id, nombre: opcion.nombre }] }
          : f,
      ),
    );
  }

  private prepararFormulario(docente: Docente | null): void {
    this.formulario.reset();
    this.formulario.controls.escuela_id.disable({ emitEvent: false });
    if (!docente) {
      return;
    }
    const facultadId = docente.escuela?.facultad?.id ?? null;
    this.formulario.reset({
      dni: docente.dni,
      nombres: docente.nombres,
      apellido_paterno: docente.apellido_paterno,
      apellido_materno: docente.apellido_materno ?? '',
      grado: docente.grado,
      tipo_contrato: docente.tipo_contrato,
      facultad_id: facultadId,
      email: docente.email ?? '',
    });
    if (facultadId !== null) {
      this.formulario.controls.escuela_id.enable({ emitEvent: false });
      this.formulario.controls.escuela_id.setValue(docente.escuela_id);
    }
  }

  private detalleError(error: unknown): string {
    const mensaje = (error as { error?: { message?: string } })?.error?.message;
    return mensaje ?? 'Ocurrió un error inesperado.';
  }
}
