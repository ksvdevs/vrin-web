import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';

import { Docente, DocentePayload, GRADOS, TIPOS_CONTRATO } from '../../../core/models/docente.model';
import { AuthService } from '../../../core/services/auth.service';
import { DocenteService } from '../../../core/services/docente.service';
import { DocenteFormulario } from '../../../shared/docente-formulario/docente-formulario';

@Component({
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

  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol_codigo === 'ADMINISTRADOR_GENERAL');

  protected readonly docentes = signal<Docente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<boolean | null>(null);
  protected readonly filtroContrato = signal<string | null>(null);
  protected readonly filtroGrado = signal<string | null>(null);
  protected readonly opcionesEstado = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];
  protected readonly opcionesContrato = [
    { label: 'Todos', value: null },
    ...TIPOS_CONTRATO.map((tipo) => ({ label: tipo, value: tipo })),
  ];
  protected readonly opcionesGrado = [
    { label: 'Todos', value: null },
    ...GRADOS.map((grado) => ({ label: grado, value: grado })),
  ];
  protected readonly registrosPorPagina = 5;
  protected primeraFila = 0;
  protected readonly docentesFiltrados = computed(() => {
    const terminos = this.busqueda().trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const estado = this.filtroEstado();
    const contrato = this.filtroContrato();
    const grado = this.filtroGrado();

    return this.docentes().filter((docente) => {
      const texto = `${docente.dni} ${docente.apellido_paterno} ${docente.apellido_materno ?? ''} ${docente.nombres}`.toLocaleLowerCase();
      return terminos.every((termino) => texto.includes(termino))
        && (estado === null || docente.activo === estado)
        && (contrato === null || docente.tipo_contrato === contrato)
        && (grado === null || docente.grado === grado);
    });
  });

  protected readonly dialogoVisible = signal(false);
  protected readonly docenteEnEdicion = signal<Docente | null>(null);

  ngOnInit(): void {
    this.auth.verificarSesion().subscribe();
    this.cargarDocentes();
  }

  protected alBuscar(termino: string): void {
    this.busqueda.set(termino);
    this.reiniciarPagina();
  }

  protected reiniciarPagina(): void {
    this.primeraFila = 0;
  }

  protected textoPaginacion(): string {
    const total = this.docentesFiltrados().length;
    const visibles = Math.max(0, Math.min(this.registrosPorPagina, total - this.primeraFila));
    return `Mostrando ${visibles} de ${total} docentes`;
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
    this.cargarDocentes();
  }

  protected confirmarCambioEstado(docente: Docente): void {
    const desactivar = docente.activo;
    this.confirmacion.confirm({
      header: desactivar ? 'Desactivar docente' : 'Activar docente',
      message: `¿${desactivar ? 'Desactivar' : 'Activar'} a ${docente.apellido_paterno}, ${docente.nombres}?`,
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

  protected confirmarEliminar(docente: Docente): void {
    this.confirmacion.confirm({
      header: 'Eliminar docente',
      message: `¿Eliminar a ${docente.apellido_paterno}, ${docente.nombres}? Dejará de aparecer en todos los listados.`,
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
          detail: `${docente.apellido_paterno}, ${docente.nombres}`,
        });
        this.cargarDocentes();
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
      .cambiarEstado(docente.id, this.payloadDesdeDocente(docente, !docente.activo))
      .subscribe({
        next: () => {
          this.mensajes.add({
            severity: 'success',
            summary: docente.activo ? 'Docente desactivado' : 'Docente activado',
            detail: `${docente.apellido_paterno}, ${docente.nombres}`,
          });
          this.cargarDocentes();
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

  private payloadDesdeDocente(docente: Docente, activo: boolean): DocentePayload {
    return {
      dni: docente.dni,
      nombres: docente.nombres,
      apellido_paterno: docente.apellido_paterno,
      apellido_materno: docente.apellido_materno ?? null,
      grado: docente.grado,
      tipo_contrato: docente.tipo_contrato,
      escuela_id: docente.escuela_id,
      email: docente.email ?? null,
      activo,
    };
  }

  private cargarDocentes(): void {
    this.cargando.set(true);
    this.docenteService.listar().subscribe({
      next: (docentes) => {
        this.docentes.set(docentes);
        this.primeraFila = 0;
        this.cargando.set(false);
      },
      error: () => {
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
