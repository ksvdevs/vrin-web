import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Docente } from '../../../core/models/docente.model';
import { RespuestaPaginada } from '../../../core/models/paginacion.model';
import { AuthService } from '../../../core/services/auth.service';
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
  let cambiarEstado: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    respuestas = [];
    listar = vi.fn(() => {
      const respuesta = new Subject<RespuestaPaginada<Docente>>();
      respuestas.push(respuesta);
      return respuesta.asObservable();
    });
    cambiarEstado = vi.fn(() => of({ ...docente, activo: false }));

    await TestBed.configureTestingModule({
      imports: [Docentes],
      providers: [
        MessageService, ConfirmationService,
        { provide: AuthService, useValue: { verificarSesion: () => of(true), usuarioActual: signal({ rol_codigo: 'ADMINISTRADOR_GENERAL' }) } },
        { provide: DocenteService, useValue: { listar, cambiarEstado } },
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

  it('cambia el estado enviando solo el nuevo valor', () => {
    const componente = abrir();
    componente['cambiarEstado'](docente);

    expect(cambiarEstado).toHaveBeenCalledWith(1, false);
    expect(listar).toHaveBeenCalledTimes(2);
  });
});
