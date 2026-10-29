import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ListaExpedientes } from './lista';
import { AuthService } from '../../../core/services/auth.service';
import { ExpedienteService } from '../../../core/services/expediente.service';
import { PlantillaService, SeleccionService } from '../../../core/services/plantilla.service';

describe('Selección de plantillas al volver a la lista', () => {
  const cache = { usuarioId: 1, cartas: [], resoluciones: [], cartaId: 7, resolucionId: 8 };
  let selecciones: Subject<any[]>;
  let plantillas: Subject<any>;
  let seleccionService: { catalogo: ReturnType<typeof signal<any>>, listarVigentes: ReturnType<typeof vi.fn>, seleccionar: ReturnType<typeof vi.fn> };
  const auth = { usuarioActual: () => ({ id: 1, rol_codigo: 'ADMINISTRADOR_GENERAL' }), verificarSesion: vi.fn() };
  let plantillaService: { listar: ReturnType<typeof vi.fn>, listarTipos: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    selecciones = new Subject();
    plantillas = new Subject();
    seleccionService = { catalogo: signal({ ...cache }), listarVigentes: vi.fn(() => selecciones), seleccionar: vi.fn() };
    plantillaService = { listar: vi.fn(() => plantillas), listarTipos: vi.fn(() => of([
      { id: 1, codigo: 'CARTA', nombre: 'Carta' },
      { id: 2, codigo: 'RESOLUCION', nombre: 'Resolución' },
    ])) };
    await TestBed.configureTestingModule({
      imports: [ListaExpedientes],
      providers: [provideRouter([]), MessageService, ConfirmationService,
        { provide: AuthService, useValue: auth },
        { provide: ExpedienteService, useValue: { listar: () => of({ data: [], meta: { total: 0 } }) } },
        { provide: PlantillaService, useValue: plantillaService },
        { provide: SeleccionService, useValue: seleccionService },
      ],
    }).overrideComponent(ListaExpedientes, { set: { template: '' } }).compileComponents();
  });

  function abrir() {
    const fixture = TestBed.createComponent(ListaExpedientes);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('restaura la selección inmediatamente sin esperar otra consulta de sesión', () => {
    const componente = abrir();
    expect(componente['seleccionCartaId']()).toBe(7);
    expect(componente['seleccionResolucionId']()).toBe(8);
    expect(auth.verificarSesion).not.toHaveBeenCalled();
    expect(plantillaService.listar).toHaveBeenCalledWith({ estado: 'ACTIVO' }, 1, 100);
  });

  it('actualiza opciones y selección juntas cuando terminan ambas consultas', () => {
    const componente = abrir();
    plantillas.next({ data: [{ id: 9, estado: 'ACTIVO', sin_mapeo: [], tipo_documento: { codigo: 'CARTA' } }] });
    plantillas.complete();
    expect(componente['seleccionCartaId']()).toBe(7);
    selecciones.next([{ tipo_documento: { codigo: 'CARTA' }, plantilla: { id: 9 } }]);
    selecciones.complete();
    expect(componente['seleccionCartaId']()).toBe(9);
    expect(componente['plantillasCarta']()[0].id).toBe(9);
    expect(seleccionService.catalogo().cartaId).toBe(9);
    expect(componente['actualizandoPlantillas']()).toBe(false);
  });

  it('restaura la selección guardada si falla el cambio de plantilla', () => {
    const componente = abrir();
    plantillas.next({ data: [] }); plantillas.complete();
    selecciones.next([{ tipo_documento: { codigo: 'CARTA' }, plantilla: { id: 7 } }]); selecciones.complete();
    seleccionService.seleccionar.mockReturnValue(throwError(() => new Error('Sin conexión')));
    componente['alCambiarPlantilla'](1, 9);
    expect(componente['seleccionCartaId']()).toBe(7);
    expect(seleccionService.catalogo().cartaId).toBe(7);
  });

  it('usa el ID real del tipo de documento al seleccionar', () => {
    plantillaService.listarTipos.mockReturnValue(of([
      { id: 10, codigo: 'CARTA', nombre: 'Carta' },
      { id: 20, codigo: 'RESOLUCION', nombre: 'Resolución' },
    ]));
    const componente = abrir();
    plantillas.next({ data: [{ id: 9, estado: 'ACTIVO', sin_mapeo: [], tipo_documento: { id: 10, codigo: 'CARTA' } }] });
    plantillas.complete();
    selecciones.next([]);
    selecciones.complete();
    seleccionService.seleccionar.mockReturnValue(of({ plantilla_id: 9 }));

    expect(componente['tipoCartaId']()).toBe(10);
    componente['alCambiarPlantilla'](10, 9);
    expect(seleccionService.seleccionar).toHaveBeenCalledWith({
      modulo: 'ARTICULOS', tipo_documento_id: 10, plantilla_id: 9,
    });
  });

  it('incluye plantillas activas de páginas posteriores', () => {
    plantillaService.listar.mockImplementation((_filtros: unknown, pagina: number) => of({
      data: [{ id: pagina, estado: 'ACTIVO', sin_mapeo: [], tipo_documento: { codigo: 'CARTA' } }],
      current_page: pagina, last_page: 2,
    }));
    const componente = abrir();
    selecciones.next([]);
    selecciones.complete();

    expect(plantillaService.listar).toHaveBeenCalledTimes(2);
    expect(componente['plantillasCarta']().map(p => p.id)).toEqual([1, 2]);
  });
});
