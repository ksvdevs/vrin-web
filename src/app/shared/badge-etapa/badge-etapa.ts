import { Component, computed, input } from '@angular/core';

import { ESTADO_INFO, type EstadoExpediente } from '../../core/models/expediente.model';

interface PasoEtapa {
  indice: number;
  etiqueta: string;
  completado: boolean;
  fallido: boolean;
  actual: boolean;
  marcado: boolean;
}

@Component({
  selector: 'app-badge-etapa',
  templateUrl: './badge-etapa.html',
  styleUrl: './badge-etapa.scss',
  host: { '[class.compacto]': 'compacto()' },
})
export class BadgeEtapa {
  readonly estado = input.required<EstadoExpediente>();
  // Permite override (p. ej. etapa_actual del expediente); por defecto se deriva del estado.
  readonly etapa = input<number | null>(null);
  readonly compacto = input(false);

  private readonly etiquetas = ['Carta Doc.', 'Carta OPP', 'Emitida', 'Rendido'];

  protected readonly pasos = computed<PasoEtapa[]>(() => {
    const info = ESTADO_INFO[this.estado()];
    let etapa = this.etapa() ?? info?.etapa ?? 1;
    if (this.compacto()) {
      if (this.estado() === 'VALIDADO_CALIDAD') etapa = 2;
      if (this.estado() === 'DISPONIBILIDAD_CONFIRMADA') etapa = 3;
      if (this.estado() === 'RESOLUCION_EMITIDA') etapa = 4;
    }
    const terminal = info?.terminal ?? false;

    const etiquetas = this.compacto()
      ? ['Solicitud', 'Carta OPP', 'Resolución', 'Rendición']
      : this.etiquetas;
    return etiquetas.map((etiqueta, posicion) => {
      const indice = posicion + 1;
      // Un terminal exitoso (RENDIDO) cierra el último paso con check, no como «actual».
      const completado =
        indice < etapa || (indice === etapa && terminal && info?.severity === 'success');
      const fallido = indice === etapa && terminal && info?.severity !== 'success';

      if (this.compacto() && indice === etapa) {
        if (indice === 1) etiqueta = info.label;
        if (this.estado() === 'EN_ESPERA_OPP') etiqueta = 'Espera OPP';
        if (this.estado() === 'SIN_DISPONIBILIDAD') etiqueta = 'Sin fondos';
        if (this.estado() === 'POR_RENDIR') etiqueta = 'Por rendir';
        if (this.estado() === 'RENDICION_VENCIDA') etiqueta = 'Vencida';
        if (this.estado() === 'RENDIDO') etiqueta = 'Rendido';
      }
      return {
        indice,
        etiqueta,
        completado,
        fallido,
        actual: indice === etapa && !completado && !fallido,
        marcado:
          this.compacto() && indice === 4 && ['POR_RENDIR', 'RENDIDO'].includes(this.estado()),
      };
    });
  });

  protected readonly titulo = computed(() => ESTADO_INFO[this.estado()]?.label ?? this.estado());
}
