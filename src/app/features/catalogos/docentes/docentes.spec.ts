import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Docente } from '../../../core/models/docente.model';
import { RespuestaPaginada } from '../../../core/models/paginacion.model';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { DocenteService } from '../../../core/services/docente.service';
import { Docentes } from './docentes';

describe('Tabla de docentes', () => {
  const docente: Docente = {
    id: 1, dni: '98712345', nombres: 'Maria', apellido_paterno: 'Quispe',
    genero: 'FEMENINO', grado: 'Dra.', tipo_contrato: 'CONTRATADO',
    categoria: 'CONTRATADO', escuela_id: 1, activo: true,
  };
  let respuestas: Subject<RespuestaPaginada<Docente>>[];
  let listar: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    respuestas = [];
    listar = vi.fn(() => {
      const respuesta = new Subject<RespuestaPaginada<Docente>>();
      respuestas.push(respuesta);
      return respuesta.asObservable();
    });

    await TestBed.configureTestingModule({
      imports: [Docentes],
      providers: [
        MessageService, ConfirmationService,
        { provide: AuthService, useValue: { verificarSesion: () => of(true), usuarioActual: signal({ rol_codigo: 'ADMINISTRADOR_GENERAL' }) } },
        { provide: CatalogoService, useValue: { listarFacultades: () => of([
          { id: 1, nombre: 'Ingeniería', escuelas: [{ id: 4, nombre: 'Ingeniería Civil' }] },
        ]) } },
        { provide: DocenteService, useValue: { listar } },
      ],
    }).overrideComponent(Docentes, { set: { template: '' } }).compileComponents();
  });

  function abrir(): Docentes {
    const fixture = TestBed.createComponent(Docentes);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('descarta respuestas anteriores cuando cambian los filtros', () => {
    const componente = abrir();
    componente['filtroEstado'].set(true);
    componente['reiniciarPagina']();

    respuestas[1].next({ data: [docente], total: 1, current_page: 1, last_page: 1, per_page: 15 });
    respuestas[0].next({ data: [], total: 0, current_page: 1, last_page: 1, per_page: 15 });

    expect(listar).toHaveBeenCalledTimes(2);
    expect(componente['docentes']()).toEqual([docente]);
    expect(componente['total']()).toBe(1);
  });

  it('presenta el nombre y la categoría como en la tabla', () => {
    const componente = abrir();
    expect(componente['nombreCompleto']({ ...docente, apellido_materno: 'Rojas' })).toBe('Maria Quispe Rojas');
    expect(componente['nombreCategoria'](docente)).toBe('Contratado');
    expect(componente['nombreCategoria']({ ...docente, categoria: 'ORDINARIO_ASOCIADO' }))
      .toBe('Ordinario/Asociado');
  });

  it('envía filtros de carrera, categoría, género y estado sin grado', () => {
    const componente = abrir();
    expect(componente['opcionesCarrera']()).toContainEqual({
      label: 'Ingeniería Civil (Ingeniería)', value: 4,
    });
    componente['filtroCarrera'].set(4);
    componente['filtroCategoria'].set('CONTRATADO');
    componente['filtroGenero'].set('FEMENINO');
    componente['filtroEstado'].set(false);
    componente['reiniciarPagina']();

    expect(listar).toHaveBeenLastCalledWith({
      busqueda: undefined, escuela_id: 4, categoria: 'CONTRATADO',
      genero: 'FEMENINO', activo: 0,
    }, 1);
  });

  it('vuelve a la primera página sin filtros después de registrar un docente', () => {
    const componente = abrir();
    componente['busqueda'].set('Quispe');
    componente['filtroEstado'].set(false);
    componente['filtroCategoria'].set('CONTRATADO');
    componente['filtroGenero'].set('FEMENINO');
    componente['filtroCarrera'].set(4);
    componente['primeraFila'] = 30;

    componente['alGuardarDocente']();

    expect(componente['primeraFila']).toBe(0);
    expect(listar).toHaveBeenLastCalledWith({
      busqueda: undefined, activo: undefined, categoria: undefined,
      genero: undefined, escuela_id: undefined,
    }, 1);
  });
});
