import { Component, computed, input } from '@angular/core';

import { ESTADO_INFO, type EstadoExpediente } from '../../core/models/expediente.model';

interface PasoEtapa {
  indice: number;
  etiqueta: string;
  completado: boolean;
  fallido: boolean;
  actual: boolean;
}

@Component({
  selector: 'app-badge-etapa',
  templateUrl: './badge-etapa.html',
  styleUrl: './badge-etapa.scss',
})
export class BadgeEtapa {
  readonly estado = input.required<EstadoExpediente>();
  // Permite override (p. ej. etapa_actual del expediente); por defecto se deriva del estado.
  readonly etapa = input<number | null>(null);

  private readonly etiquetas = ['Carta Doc.', 'Carta OPP', 'Emitida', 'Rendido'];

  protected readonly pasos = computed<PasoEtapa[]>(() => {
    const info = ESTADO_INFO[this.estado()];
    const etapa = this.etapa() ?? info?.etapa ?? 1;
    const terminal = info?.terminal ?? false;

    return this.etiquetas.map((etiqueta, posicion) => {
      const indice = posicion + 1;
      // Un terminal exitoso (RENDIDO) cierra el último paso con check, no como «actual».
      const completado = indice < etapa || (indice === etapa && terminal && info?.severity === 'success');
      const fallido = indice === etapa && terminal && info?.severity !== 'success';

      return { indice, etiqueta, completado, fallido, actual: indice === etapa && !completado && !fallido };
    });
  });

  protected readonly titulo = computed(() => ESTADO_INFO[this.estado()]?.label ?? this.estado());
}
