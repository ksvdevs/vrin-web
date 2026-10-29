import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';

import type { ExpedienteDetalle } from '../../core/models/expediente-detalle.model';
import { ExpedienteService } from '../../core/services/expediente.service';
import { ValidacionExpediente } from './validacion-expediente';

describe('Observación de Calidad', () => {
  it('la exige si algún requisito no cumple y la deja opcional cuando todos cumplen', async () => {
    const validar = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ValidacionExpediente],
      providers: [
        { provide: ExpedienteService, useValue: { validar } },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).overrideComponent(ValidacionExpediente, { set: { template: '' } }).compileComponents();

    const componente = TestBed.createComponent(ValidacionExpediente).componentInstance;
    const controles = componente['formulario'].controls;
    controles.carta_aceptacion.setValue(true);
    controles.docente_ordinario_contratado.setValue(true);
    controles.afiliacion_universidad.setValue(false);

    expect(componente.observacionObligatoria).toBe(true);
    expect(controles.observacion.invalid).toBe(true);
    componente['guardar']();
    expect(validar).not.toHaveBeenCalled();

    controles.observacion.setValue('   ');
    expect(controles.observacion.invalid).toBe(true);
    controles.observacion.setValue('Falta la afiliación institucional.');
    expect(controles.observacion.valid).toBe(true);

    controles.afiliacion_universidad.setValue(true);
    controles.observacion.setValue('');
    expect(componente.observacionObligatoria).toBe(false);
    expect(controles.observacion.valid).toBe(true);
    expect(componente.resultado).toBe('CUMPLE');

    controles.observacion.setValue('Falta firma del docente');
    expect(componente.resultado).toBe('NO_CUMPLE');
    controles.observacion.setValue('   ');
    expect(componente.resultado).toBe('CUMPLE');
  });

  it('recupera la observación y el último motivo editable al abrir la reevaluación', async () => {
    await TestBed.configureTestingModule({
      imports: [ValidacionExpediente],
      providers: [
        { provide: ExpedienteService, useValue: {} },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).overrideComponent(ValidacionExpediente, { set: { template: '' } }).compileComponents();

    const fixture = TestBed.createComponent(ValidacionExpediente);
    fixture.componentRef.setInput('expediente', {
      estado: 'NO_CUMPLE',
      validacion_calidad: {
        checklist: {
          carta_aceptacion: true,
          docente_ordinario_contratado: true,
          afiliacion_universidad: true,
        },
        observacion: 'Falta firma del docente',
        ultimo_motivo_reevaluacion: 'Hubo un fallo en la revisión',
      },
    } as unknown as ExpedienteDetalle);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const componente = fixture.componentInstance;
    expect(componente['formulario'].controls.observacion.value).toBe('Falta firma del docente');
    expect(componente['formulario'].controls.motivo_correccion.value).toBe('Hubo un fallo en la revisión');
    componente['formulario'].controls.motivo_correccion.setValue('Se corrigió el criterio de revisión');
    expect(componente['formulario'].controls.motivo_correccion.value).toBe('Se corrigió el criterio de revisión');
    expect(componente.resultado).toBe('NO_CUMPLE');
  });
});
