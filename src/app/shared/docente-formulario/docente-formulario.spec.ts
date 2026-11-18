import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Docente } from '../../core/models/docente.model';
import { AuthService } from '../../core/services/auth.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { DocenteService } from '../../core/services/docente.service';
import { DocenteFormulario } from './docente-formulario';

describe('Formulario de docente', () => {
  const docente: Docente = {
    id: 1, dni: '98712345', nombres: 'Maria', apellido_paterno: 'De la Cruz',
    apellido_materno: 'Del Rio', genero: 'FEMENINO', grado: 'Dra.',
    tipo_contrato: 'NOMBRADO', categoria: 'ORDINARIO_AUXILIAR',
    escuela_id: 1, email: 'maria@example.com', activo: true,
    escuela: { id: 1, nombre: 'Escuela', facultad: { id: 1, nombre: 'Facultad' } },
  };
  let actualizar: ReturnType<typeof vi.fn>;
  let consultarDni: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    actualizar = vi.fn(() => of(docente));
    consultarDni = vi.fn(() => of({
      registrado: false,
      datos: { nombres: 'Maria Elena', apellido_paterno: 'Quispe', apellido_materno: 'Rojas' },
    }));
    await TestBed.configureTestingModule({
      imports: [DocenteFormulario],
      providers: [
        MessageService,
        { provide: AuthService, useValue: { usuarioActual: signal({ rol_codigo: 'ADMINISTRADOR_GENERAL' }) } },
        { provide: CatalogoService, useValue: { listarFacultades: () => of([]) } },
        { provide: DocenteService, useValue: { actualizar, consultarDni } },
      ],
    }).overrideComponent(DocenteFormulario, { set: { template: '' } }).compileComponents();
  });

  it('conserva los apellidos compuestos al editar', () => {
    const fixture = TestBed.createComponent(DocenteFormulario);
    fixture.componentRef.setInput('docente', docente);
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();

    const componente = fixture.componentInstance;
    expect(componente['formulario'].controls.apellido_paterno.value).toBe('De la Cruz');
    expect(componente['formulario'].controls.apellido_materno.value).toBe('Del Rio');

    componente['formulario'].controls.apellido_materno.setValue('De los Rios');
    componente['guardar']();

    expect(actualizar).toHaveBeenCalledWith(1, expect.objectContaining({
      apellido_paterno: 'De la Cruz', apellido_materno: 'De los Rios',
    }));
  });

  it('completa nombres y apellidos al consultar un DNI nuevo', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(DocenteFormulario);
      fixture.componentInstance.visible.set(true);
      fixture.detectChanges();
      fixture.componentInstance['formulario'].controls.dni.setValue('77100148');
      await vi.advanceTimersByTimeAsync(350);

      expect(consultarDni).toHaveBeenCalledWith('77100148');
      expect(fixture.componentInstance['formulario'].getRawValue()).toEqual(expect.objectContaining({
        nombres: 'Maria Elena', apellido_paterno: 'Quispe', apellido_materno: 'Rojas',
      }));
      fixture.componentInstance['formulario'].controls.dni.setValue('77100149');
      expect(fixture.componentInstance['formulario'].controls.nombres.value).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('bloquea el registro cuando el DNI ya existe', async () => {
    consultarDni.mockReturnValue(of({ registrado: true }));
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(DocenteFormulario);
      fixture.componentInstance.visible.set(true);
      fixture.detectChanges();
      fixture.componentInstance['formulario'].controls.dni.setValue('77100148');
      await vi.advanceTimersByTimeAsync(350);

      expect(fixture.componentInstance['dniRegistrado']()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('descarta letras y simbolos del DNI y celular', () => {
    const fixture = TestBed.createComponent(DocenteFormulario);
    fixture.detectChanges();
    const dni = document.createElement('input');
    dni.value = '77a100-148';
    fixture.componentInstance['filtrarNumeros']({ target: dni } as unknown as Event, 'dni', 8);
    expect(dni.value).toBe('77100148');
    expect(fixture.componentInstance['formulario'].controls.dni.value).toBe('77100148');

    const celular = document.createElement('input');
    celular.value = '9 87a123-4567';
    fixture.componentInstance['filtrarNumeros']({ target: celular } as unknown as Event, 'celular', 9);
    expect(celular.value).toBe('987123456');
    expect(fixture.componentInstance['formulario'].controls.celular.value).toBe('987123456');
  });
});
