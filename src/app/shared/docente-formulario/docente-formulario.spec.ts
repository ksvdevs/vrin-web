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

  beforeEach(async () => {
    actualizar = vi.fn(() => of(docente));
    await TestBed.configureTestingModule({
      imports: [DocenteFormulario],
      providers: [
        MessageService,
        { provide: AuthService, useValue: { usuarioActual: signal({ rol_codigo: 'ADMINISTRADOR_GENERAL' }) } },
        { provide: CatalogoService, useValue: { listarFacultades: () => of([]) } },
        { provide: DocenteService, useValue: { actualizar } },
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
});
