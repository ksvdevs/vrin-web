import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';

import { ExpedienteDetalle } from '../../../core/models/expediente-detalle.model';
import {
  REQUISITOS_VALIDACION,
  type ChecklistValidacion,
  type RespuestaValidacion,
} from '../../../core/models/validacion.model';
import { ExpedienteService } from '../../../core/services/expediente.service';

/**
 * Fase 4 — drawer «Validación de Expediente de Artículo Financiado» (HU-25).
 * Datos del expediente en solo lectura + checklist de los 3 requisitos (RN-01).
 */
@Component({
  selector: 'app-validacion-drawer',
  imports: [Button, Drawer, ReactiveFormsModule, SelectButton, Tag, Textarea],
  templateUrl: './validacion-drawer.html',
  styleUrl: './validacion-drawer.scss',
})
export class ValidacionDrawer {
  private readonly fb = inject(FormBuilder);
  private readonly expedienteService = inject(ExpedienteService);

  readonly expediente = input.required<ExpedienteDetalle>();
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly guardada = output<RespuestaValidacion>();

  protected readonly requisitos = REQUISITOS_VALIDACION;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly opcionesCumplimiento = [
    { label: 'Cumple', value: true },
    { label: 'No Cumple', value: false },
  ];

  protected readonly form = this.fb.group({
    carta_aceptacion: [null as boolean | null, Validators.required],
    docente_ordinario_contratado: [null as boolean | null, Validators.required],
    afiliacion_universidad: [null as boolean | null, Validators.required],
    observacion: [''],
  });

  // El resultado se deriva del checklist: los 3 en «Cumple» → CUMPLE (RN-01).
  protected readonly resultado = computed<'CUMPLE' | 'NO_CUMPLE' | null>(() => {
    const valores = this.form.getRawValue();
    const claves: (keyof ChecklistValidacion)[] = [
      'carta_aceptacion',
      'docente_ordinario_contratado',
      'afiliacion_universidad',
    ];
    if (claves.some((clave) => valores[clave] === null)) {
      return null;
    }
    return claves.every((clave) => valores[clave] === true) ? 'CUMPLE' : 'NO_CUMPLE';
  });

  protected cerrar(): void {
    this.visibleChange.emit(false);
  }

  protected guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const resultado = this.resultado();
    if (resultado === null) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.expedienteService
      .validar(this.expediente().id, {
        resultado,
        checklist: {
          carta_aceptacion: valores.carta_aceptacion === true,
          docente_ordinario_contratado: valores.docente_ordinario_contratado === true,
          afiliacion_universidad: valores.afiliacion_universidad === true,
        },
        observacion: valores.observacion?.trim() || null,
      })
      .subscribe({
        next: (respuesta) => {
          this.guardando.set(false);
          this.guardada.emit(respuesta);
          this.cerrar();
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(
            (err as { error?: { message?: string } })?.error?.message ??
              'No se pudo guardar la validación.',
          );
        },
      });
  }
}
