import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { DocenteService } from '../../core/services/docente.service';
import { SelectConAltaInline } from '../select-con-alta-inline/select-con-alta-inline';
import { DocenteFormulario } from './docente-formulario';

describe('Selección de carrera en el formulario de docente', () => {
  it('actualiza el selector de carreras al elegir una facultad', async () => {
    await TestBed.configureTestingModule({
      imports: [DocenteFormulario],
      providers: [
        MessageService,
        { provide: AuthService, useValue: { usuarioActual: signal({ rol_codigo: 'SECRETARIA' }) } },
        { provide: CatalogoService, useValue: {
          listarFacultades: () => of([{ id: 3, nombre: 'Ingeniería', escuelas: [] }]),
          listarEscuelas: () => of([{ id: 18, nombre: 'Ingeniería Informática y Sistemas' }]),
        } },
        { provide: DocenteService, useValue: {} },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocenteFormulario);
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();
    const selectores = fixture.debugElement.queryAll(By.directive(SelectConAltaInline));
    const facultad = selectores[0].componentInstance as SelectConAltaInline;
    const carrera = selectores[1].componentInstance as SelectConAltaInline;

    facultad['alCambiar'](3);
    fixture.detectChanges();

    expect(fixture.componentInstance['formulario'].controls.facultad_id.value).toBe(3);
    expect(carrera.opciones()).toEqual([{ id: 18, nombre: 'Ingeniería Informática y Sistemas' }]);
    expect(carrera['deshabilitado']()).toBe(false);
  });
});
