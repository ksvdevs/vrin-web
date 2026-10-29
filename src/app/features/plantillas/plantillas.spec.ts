import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import type { Plantilla } from '../../core/models/plantilla.model';
import type { RespuestaPaginada } from '../../core/models/paginacion.model';
import { AuthService } from '../../core/services/auth.service';
import { PlantillaService, SeleccionService } from '../../core/services/plantilla.service';
import { Plantillas } from './plantillas';

describe('Gestor de plantillas', () => {
  const plantilla: Plantilla = {
    id: 1, codigo: 'PLA-0001', nombre: 'Carta', modulo: 'ARTICULOS',
    tipo_documento: { id: 1, codigo: 'CARTA', nombre: 'Carta' }, version: 1,
    estado: 'ACTIVO', vigente: false, tokens_count: 2, sin_mapeo: [], sha256: 'abc', created_at: '2026-10-27 10:00:00',
  };
  let respuestas: Subject<RespuestaPaginada<Plantilla>>[];
  let listar: ReturnType<typeof vi.fn>;
  let subir: ReturnType<typeof vi.fn>;
  let actualizarNombre: ReturnType<typeof vi.fn>;
  let eliminar: ReturnType<typeof vi.fn>;
  let catalogo = signal<unknown>(null);

  beforeEach(async () => {
    respuestas = [];
    listar = vi.fn(() => {
      const respuesta = new Subject<RespuestaPaginada<Plantilla>>();
      respuestas.push(respuesta);
      return respuesta.asObservable();
    });
    subir = vi.fn(() => of(plantilla));
    actualizarNombre = vi.fn(() => of({ id: 1, nombre: 'Carta corregida', estado: 'ACTIVO' }));
    eliminar = vi.fn(() => of(undefined));
    catalogo = signal<unknown>({ usuarioId: 1 });

    await TestBed.configureTestingModule({
      imports: [Plantillas],
      providers: [
        MessageService, ConfirmationService,
        { provide: AuthService, useValue: { verificarSesion: () => of(true), usuarioActual: signal({ rol_codigo: 'ADMINISTRADOR_GENERAL' }) } },
        { provide: PlantillaService, useValue: { listar, listarTipos: () => of([plantilla.tipo_documento]), subir, actualizarNombre, eliminar } },
        { provide: SeleccionService, useValue: { catalogo } },
      ],
    }).overrideComponent(Plantillas, { set: { template: '' } }).compileComponents();
  });

  function abrir(): Plantillas {
    const fixture = TestBed.createComponent(Plantillas);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('descarta resultados antiguos al cambiar el filtro', () => {
    const componente = abrir();
    expect(listar).toHaveBeenCalledWith(
      expect.any(Object), 1, 15,
    );
    componente['filtroEstado'].set('ACTIVO');
    componente['reiniciarPagina']();

    respuestas[1].next({ data: [plantilla], total: 1, current_page: 1, last_page: 1, per_page: 15 });
    respuestas[0].next({ data: [], total: 0, current_page: 1, last_page: 1, per_page: 15 });

    expect(componente['plantillas']()).toEqual([plantilla]);
    expect(componente['total']()).toBe(1);
  });

  it('envía el archivo y el tipo cargado desde el catálogo', () => {
    const componente = abrir();
    const archivo = new File(['docx'], 'plantilla.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    componente['formulario'].setValue({ nombre: 'Carta', tipo_documento_id: 1 });
    componente['archivoSeleccionado'].set(archivo);
    componente['subir']();

    expect(componente['tipos']()).toEqual([plantilla.tipo_documento]);
    expect(subir).toHaveBeenCalledWith({ nombre: 'Carta', tipo_documento_id: 1, archivo });
    expect(componente['archivoSeleccionado']()).toBeNull();
    expect(catalogo()).toBeNull();
  });

  it('acepta un DOCX que el navegador identifica como ZIP', () => {
    const componente = abrir();
    const archivo = new File(['contenido'], 'plantilla.docx', { type: 'application/zip' });
    componente['seleccionarArchivo']({ target: { files: [archivo], value: 'plantilla.docx' } } as unknown as Event);

    expect(componente['archivoSeleccionado']()).toBe(archivo);
  });

  it('edita el nombre y solicita confirmación antes de eliminar', () => {
    const componente = abrir();
    componente['abrirEdicion'](plantilla);
    componente['formularioEdicion'].controls.nombre.setValue('Carta corregida');
    componente['guardarEdicion']();

    expect(actualizarNombre).toHaveBeenCalledWith(1, 'Carta corregida');
    expect(componente['dialogoEdicion']()).toBe(false);

    const confirmacion = TestBed.inject(ConfirmationService);
    const confirmar = vi.spyOn(confirmacion, 'confirm');
    componente['confirmarEliminar'](plantilla);
    expect(confirmar).toHaveBeenCalled();
    confirmar.mock.calls[0][0].accept?.();
    expect(eliminar).toHaveBeenCalledWith(1);
  });
});
