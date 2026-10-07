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
  let plantillas: Subject<any[]>;
  let seleccionService: { catalogo: ReturnType<typeof signal<any>>, listarVigentes: ReturnType<typeof vi.fn>, seleccionar: ReturnType<typeof vi.fn> };
  const auth = { usuarioActual: () => ({ id: 1, rol_codigo: 'ADMINISTRADOR_GENERAL' }), verificarSesion: vi.fn() };
  let plantillaService: { listar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    selecciones = new Subject();
    plantillas = new Subject();
    seleccionService = { catalogo: signal({ ...cache }), listarVigentes: vi.fn(() => selecciones), seleccionar: vi.fn() };
    plantillaService = { listar: vi.fn(() => plantillas) };
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
    expect(plantillaService.listar).toHaveBeenCalledWith();
  });

  it('actualiza opciones y selección juntas cuando terminan ambas consultas', () => {
    const componente = abrir();
    plantillas.next([{ id: 9, estado: 'ACTIVO', tipo_documento: { codigo: 'CARTA' } }]);
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
    plantillas.next([]); plantillas.complete();
    selecciones.next([{ tipo_documento: { codigo: 'CARTA' }, plantilla: { id: 7 } }]); selecciones.complete();
    seleccionService.seleccionar.mockReturnValue(throwError(() => new Error('Sin conexión')));
    componente['alCambiarPlantilla'](1, 9);
    expect(componente['seleccionCartaId']()).toBe(7);
    expect(seleccionService.catalogo().cartaId).toBe(7);
  });
});
