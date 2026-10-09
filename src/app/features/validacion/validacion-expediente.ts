import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import type { ExpedienteDetalle } from '../../core/models/expediente-detalle.model';
import { ExpedienteService } from '../../core/services/expediente.service';

interface Requisito {
  clave: 'carta_aceptacion' | 'docente_ordinario_contratado' | 'afiliacion_universidad';
  etiqueta: string;
  ayuda: string;
}

const REQUISITOS: Requisito[] = [
  { clave: 'carta_aceptacion', etiqueta: 'Carta Oficial de Aceptación', ayuda: 'La revista emitió carta oficial de aceptación del artículo.' },
  { clave: 'docente_ordinario_contratado', etiqueta: 'Docente Ordinario o Contratado', ayuda: 'El docente tiene condición de ordinario o contratado vigente.' },
  { clave: 'afiliacion_universidad', etiqueta: 'Afiliación a la Universidad', ayuda: 'El artículo declara afiliación a la UNAMBA.' },
];

@Component({
  selector: 'app-validacion-expediente',
  imports: [ReactiveFormsModule, Select, Textarea],
  templateUrl: './validacion-expediente.html',
  styleUrl: './validacion-expediente.scss',
})
export class ValidacionExpediente {
  private readonly fb = inject(FormBuilder);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly mensajes = inject(MessageService);

  readonly visible = model(false);
  readonly expediente = input<ExpedienteDetalle | null>(null);
  readonly guardado = output<void>();
  protected readonly esReevaluacion = computed(() =>
    ['VALIDADO_CALIDAD', 'NO_CUMPLE'].includes(this.expediente()?.estado ?? ''),
  );

  protected readonly guardando = signal(false);

  protected readonly opciones = [
    { label: 'Cumple', value: true },
    { label: 'No cumple', value: false },
  ];

  protected readonly formulario = this.fb.group({
    carta_aceptacion: [null as boolean | null, Validators.required],
    docente_ordinario_contratado: [null as boolean | null, Validators.required],
    afiliacion_universidad: [null as boolean | null, Validators.required],
    observacion: [''],
    motivo_correccion: ['', Validators.maxLength(500)],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const anterior = this.esReevaluacion() ? this.expediente()?.validacion_calidad : null;
      this.formulario.reset({
        carta_aceptacion: anterior?.checklist?.['carta_aceptacion'] ?? null,
        docente_ordinario_contratado: anterior?.checklist?.['docente_ordinario_contratado'] ?? null,
        afiliacion_universidad: anterior?.checklist?.['afiliacion_universidad'] ?? null,
        observacion: '',
        motivo_correccion: '',
      });
    });
  }

  protected readonly requisitos = REQUISITOS;

  get verificados(): number {
    return REQUISITOS.filter((r) => this.formulario.controls[r.clave].value !== null).length;
  }

  get resultado(): 'CUMPLE' | 'NO_CUMPLE' {
    return REQUISITOS.every((r) => this.formulario.controls[r.clave].value === true) ? 'CUMPLE' : 'NO_CUMPLE';
  }

  protected fechaCorta(fecha: string | null | undefined): string {
    if (!fecha) {
      return '—';
    }
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

  protected guardar(): void {
    const motivo = this.formulario.controls.motivo_correccion.value?.trim() ?? '';
    if (this.formulario.invalid || this.guardando() || (this.esReevaluacion() && motivo.length < 10)) {
      this.formulario.markAllAsTouched();
      return;
    }
    const expediente = this.expediente();
    if (!expediente) {
      return;
    }
    const valores = this.formulario.getRawValue();
    this.guardando.set(true);
    this.expedienteService
      .validar(expediente.id, {
        resultado: this.resultado,
        checklist: {
          carta_aceptacion: valores.carta_aceptacion === true,
          docente_ordinario_contratado: valores.docente_ordinario_contratado === true,
          afiliacion_universidad: valores.afiliacion_universidad === true,
        },
        observacion: valores.observacion?.trim() || null,
        motivo_correccion: this.esReevaluacion() ? motivo : null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mensajes.add({
            severity: this.resultado === 'CUMPLE' ? 'success' : 'warn',
            summary:
              this.resultado === 'CUMPLE' ? 'Expediente validado' : 'Expediente marcado No Cumple',
            detail: `${expediente.codigo} · ${REQUISITOS.filter((r) => this.formulario.controls[r.clave].value === true).length}/3 requisitos cumplen.`,
          });
          this.formulario.reset();
          this.guardado.emit();
        },
        error: (error) => {
          this.guardando.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'No se pudo guardar la validación',
            detail:
              (error as { error?: { message?: string } })?.error?.message ??
              'Ocurrió un error inesperado.',
          });
        },
      });
  }
}
