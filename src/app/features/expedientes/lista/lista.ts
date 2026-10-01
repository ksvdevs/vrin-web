import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { Toast } from 'primeng/toast';

import {
  ESTADOS_EXPEDIENTE,
  ESTADO_INFO,
  type EstadoExpediente,
  type ExpedienteFila,
} from '../../../core/models/expediente.model';
import { DevAuthService } from '../../../core/services/dev-auth.service';
import {
  ExpedienteService,
  type FiltrosExpediente,
} from '../../../core/services/expediente.service';
import { BadgeEtapa } from '../../../shared/badge-etapa/badge-etapa';

@Component({
  selector: 'app-lista-expedientes',
  imports: [
    BadgeEtapa,
    Button,
    DatePicker,
    Dialog,
    ReactiveFormsModule,
    RouterLink,
    Select,
    TableModule,
    Toast,
  ],
  templateUrl: './lista.html',
  styleUrl: './lista.scss',
})
export class ListaExpedientes implements OnInit {
  protected readonly auth = inject(DevAuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly mensajes = inject(MessageService);

  protected readonly filas = signal<ExpedienteFila[]>([]);
  protected readonly cargando = signal(false);
  protected readonly total = signal(0);
  protected readonly primeraFila = signal(0);
  protected readonly dialogoFiltros = signal(false);

  protected readonly esSecretariaOAdmin = computed(() =>
    ['SECRETARIA', 'ADMINISTRADOR'].includes(this.auth.usuarioActual()?.rol ?? ''),
  );

  protected readonly opcionesEstado = ESTADOS_EXPEDIENTE.map((estado) => ({
    label: ESTADO_INFO[estado].label,
    value: estado,
  }));

  protected readonly filtroForm = this.fb.group({
    estado: [null as EstadoExpediente | null],
    desde: [null as Date | null],
    hasta: [null as Date | null],
  });

  private filtrosAplicados: FiltrosExpediente = {};

  ngOnInit(): void {
    this.auth.cargarUsuarioActual().subscribe();
  }

  protected alCargarLazy(event: TableLazyLoadEvent): void {
    const filasPorPagina = Number(event.rows) || 5;
    const pagina = Math.floor((event.first ?? 0) / filasPorPagina) + 1;
    this.primeraFila.set(event.first ?? 0);
    this.cargar(pagina);
  }

  protected abrirFiltros(): void {
    this.dialogoFiltros.set(true);
  }

  protected aplicarFiltros(): void {
    const valores = this.filtroForm.getRawValue();
    this.filtrosAplicados = {
      estado: valores.estado ?? undefined,
      desde: this.fechaIso(valores.desde),
      hasta: this.fechaIso(valores.hasta),
    };
    this.primeraFila.set(0);
    this.dialogoFiltros.set(false);
    this.cargar(1);
  }

  protected limpiarFiltros(): void {
    this.filtroForm.reset({ estado: null, desde: null, hasta: null });
    this.filtrosAplicados = {};
    this.primeraFila.set(0);
    this.cargar(1);
  }

  protected hayFiltros(): boolean {
    return Boolean(
      this.filtrosAplicados.estado || this.filtrosAplicados.desde || this.filtrosAplicados.hasta,
    );
  }

  protected navegar(fila: ExpedienteFila): void {
    // «Validar Requisitos» abre el drawer de validación directo en el detalle.
    this.router.navigate(
      ['/expedientes', fila.id],
      fila.accion_principal.clave === 'validar'
        ? { queryParams: { accion: 'validar' } }
        : undefined,
    );
  }

  protected severidadAccion(clave: string): 'success' | 'danger' | 'secondary' {
    switch (clave) {
      case 'generar_carta':
      case 'generar_resolucion':
        return 'success';
      case 'revisar_rendicion':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.expedienteService.listar(this.filtrosAplicados, pagina).subscribe({
      next: (respuesta) => {
        this.filas.set(respuesta.data);
        this.total.set(respuesta.meta.total);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'Sin conexión',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'No se pudo obtener la bandeja de expedientes.',
        });
      },
    });
  }

  private fechaIso(fecha: Date | null): string | undefined {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      return undefined;
    }
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
