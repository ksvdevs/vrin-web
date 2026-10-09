import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface Actividad {
  id: number;
  codigo: string;
  estado: string;
  docente: string;
  updated_at: string;
}

interface ResumenPanel {
  year: number;
  expedientes: number;
  plantillas: number;
  plantillas_actualizadas: number;
  docentes: number;
  docentes_activos: number;
  monto_financiado: number;
  estados: Record<string, number>;
  actividad: Actividad[];
}

interface GrupoEstado {
  nombre: string;
  cantidad: number;
  color: string;
  porcentaje: number;
}

@Component({
  selector: 'app-inicio',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly anio = signal(new Date().getFullYear());
  protected readonly resumen = signal<ResumenPanel | null>(null);
  protected readonly error = signal(false);
  protected readonly descargando = signal(false);
  protected readonly anios = Array.from({ length: 5 }, (_, indice) => new Date().getFullYear() - indice);

  protected readonly grupos = computed<GrupoEstado[]>(() => {
    const estados = this.resumen()?.estados ?? {};
    const definiciones = [
      { nombre: 'En trámite', claves: ['EN_REVISION_CALIDAD', 'VALIDADO_CALIDAD', 'EN_ESPERA_OPP', 'DISPONIBILIDAD_CONFIRMADA', 'RESOLUCION_EMITIDA'], color: '#2861ee' },
      { nombre: 'Por rendir', claves: ['POR_RENDIR', 'RENDICION_VENCIDA'], color: '#5072b4' },
      { nombre: 'Observados', claves: ['OBSERVADO', 'NO_CUMPLE', 'SIN_DISPONIBILIDAD'], color: '#f35665' },
      { nombre: 'Cerrados', claves: ['RENDIDO'], color: '#a6b3bc' },
    ];
    const total = Object.values(estados).reduce((suma, cantidad) => suma + Number(cantidad), 0);
    return definiciones.map(({ nombre, claves, color }) => {
      const cantidad = claves.reduce((suma, clave) => suma + Number(estados[clave] ?? 0), 0);
      return { nombre, cantidad, color, porcentaje: total ? cantidad * 100 / total : 0 };
    });
  });

  protected readonly totalAnual = computed(() => this.grupos().reduce((suma, grupo) => suma + grupo.cantidad, 0));

  protected readonly grafico = computed(() => {
    if (!this.totalAnual()) return '#e8eef4 0 100%';
    let inicio = 0;
    return this.grupos().map((grupo) => {
      const fin = inicio + grupo.porcentaje;
      const tramo = `${grupo.color} ${inicio}% ${fin}%`;
      inicio = fin;
      return tramo;
    }).join(', ');
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiarAnio(evento: Event): void {
    this.anio.set(Number((evento.target as HTMLSelectElement).value));
    this.cargar();
  }

  protected descargarReporte(): void {
    if (this.descargando()) return;
    this.descargando.set(true);
    this.api.getBlob('/panel-control/reporte', { year: this.anio() }).subscribe({
      next: (archivo) => {
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `reporte-expedientes-${this.anio()}.csv`;
        enlace.click();
        URL.revokeObjectURL(url);
        this.descargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.descargando.set(false);
      },
    });
  }

  protected tituloActividad(estado: string): string {
    if (estado === 'RESOLUCION_EMITIDA') return 'Resolución emitida';
    if (estado === 'EN_ESPERA_OPP') return 'Respuesta OPP pendiente';
    if (estado === 'RENDIDO') return 'Rendición cerrada';
    if (estado === 'OBSERVADO') return 'Expediente observado';
    return 'Expediente actualizado';
  }

  protected iconoActividad(estado: string): string {
    if (estado === 'RESOLUCION_EMITIDA' || estado === 'RENDIDO') return 'pi-check';
    if (estado === 'EN_ESPERA_OPP') return 'pi-clock';
    return 'pi-arrow-up';
  }

  protected tonoActividad(estado: string): string {
    if (estado === 'EN_ESPERA_OPP') return 'ambar';
    if (estado === 'OBSERVADO') return 'rojo';
    return 'azul';
  }

  private cargar(): void {
    this.error.set(false);
    this.api.get<ResumenPanel>('/panel-control', { year: this.anio() }).subscribe({
      next: (resumen) => this.resumen.set(resumen),
      error: () => {
        this.resumen.set(null);
        this.error.set(true);
      },
    });
  }
}
