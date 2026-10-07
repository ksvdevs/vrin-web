import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ExpedienteDetalle } from '../../../core/models/expediente-detalle.model';
import { AuthService } from '../../../core/services/auth.service';
import { ArchivoService } from '../../../core/services/archivo.service';
import { CartaVrinService } from '../../../core/services/carta-vrin.service';
import { DocumentoService } from '../../../core/services/documento.service';
import { ExpedienteService } from '../../../core/services/expediente.service';
import { ResolucionService } from '../../../core/services/resolucion.service';
import { VistaExpediente } from './expediente';

describe('Etapas de carta VRIN y resolución', () => {
  let fixture: ComponentFixture<VistaExpediente>;
  let detalle: ExpedienteDetalle;
  let pasoQuery: string | null;
  const cartas = { sugerencia: () => of({ siguiente_numero: 67 }), actualizar: vi.fn(), preview: vi.fn() };
  const documentos = { obtenerBlob: vi.fn() };
  const api = {
    obtener: vi.fn(),
    generarCarta: vi.fn(),
    registrarRespuestaOpp: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:carta-vrin');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    documentos.obtenerBlob.mockReturnValue(of(new Blob(['PDF'], { type: 'application/pdf' })));
    cartas.preview.mockReturnValue(of(new Blob(['PDF'], { type: 'application/pdf' })));
    pasoQuery = null;
    detalle = {
      id: 1, codigo: 'ART-2026-000001', modulo: 'ARTICULOS', estado: 'VALIDADO_CALIDAD',
      etapa: 1, etapa_actual: 1, badge: { label: 'Validado', severity: 'success' },
      documentos_completos: true, carta_docente_numero: '017-2026', carta_docente_fecha: '2026-10-01',
      registro_mp_numero: null, cerrado_at: null, fecha_registro: '01/10/2026',
      docente: {
        id: 1, nombre_completo: 'Docente de prueba', dni: '12345678', grado: 'Dr.', tipo_contrato: 'NOMBRADO',
        email: null, escuela: { id: 1, nombre: 'Escuela de prueba' }, facultad: { id: 1, nombre: 'Ingeniería' },
      },
      articulo: { titulo: 'Artículo de prueba', revista: 'Revista', base_indexadora: 'Scopus', cuartil: 'Q1', monto_solicitado: 1500, doi: null },
      validacion_calidad: null, carta_vrin: null, respuesta_opp: null, resolucion: null, rendicion: null,
      archivos: [], observaciones: [], documentos_generados: [],
      transiciones_disponibles: [{ destino: 'EN_ESPERA_OPP', accion: { clave: 'generar_carta', etiqueta: 'Generar carta' }, habilitada: true }],
    };
    api.obtener.mockImplementation(() => of(detalle));
    api.generarCarta.mockImplementation(() => {
      esperarOpp();
      return of({ estado: 'EN_ESPERA_OPP' });
    });
    api.registrarRespuestaOpp.mockImplementation(() => {
      detalle = {
        ...detalle, estado: 'DISPONIBILIDAD_CONFIRMADA',
        respuesta_opp: { disponibilidad: 'SI', carta_numero: '017-OPP', carta_fecha: '2026-10-05', monto_aprobado: 1500,
          meta_presupuestal: '017', especifica_gasto: '2.3', fuente_financiamiento: 'Recursos',
          registro_vrin_numero: '123', registro_vrin_fecha: '2026-10-05', registrado_por: 'Secretaría' },
        transiciones_disponibles: [{ destino: 'RESOLUCION_EMITIDA', accion: { clave: 'generar_resolucion', etiqueta: 'Generar resolución' }, habilitada: true }],
      };
      return of({ estado: detalle.estado });
    });
    await TestBed.configureTestingModule({
      imports: [VistaExpediente],
      providers: [
        provideRouter([]), MessageService, ConfirmationService,
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: convertToParamMap({ id: '1' }),
          get queryParamMap() { return convertToParamMap(pasoQuery === null ? {} : { paso: pasoQuery }); },
        } } },
        { provide: ExpedienteService, useValue: api },
        { provide: CartaVrinService, useValue: cartas },
        { provide: AuthService, useValue: { usuarioActual: () => ({ rol_codigo: 'SECRETARIA' }) } },
        { provide: ResolucionService, useValue: { sugerencia: () => of({ siguiente_numero: 13 }) } },
        { provide: ArchivoService, useValue: {} },
        { provide: DocumentoService, useValue: documentos },
      ],
    }).compileComponents();
  });

  function esperarOpp(): void {
    detalle = {
      ...detalle, estado: 'EN_ESPERA_OPP', etapa_actual: 2,
      carta_vrin: { numero: '67', anio: 2026, fecha: '2026-10-05', ciudad: 'Abancay', estado: 'EMITIDA', emitida_por: 'Secretaría' },
      transiciones_disponibles: [{ destino: 'DISPONIBILIDAD_CONFIRMADA', accion: null, habilitada: true }],
    };
  }

  async function abrir(): Promise<void> {
    fixture = TestBed.createComponent(VistaExpediente);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function boton(label: string): HTMLButtonElement {
    const botones = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const encontrado = botones.find((b) => b.textContent?.trim() === label);
    expect(encontrado, `Botón ${label}`).toBeDefined();
    return encontrado!;
  }

  it('muestra el formulario y Guardar cambios en el paso 2, sin respuesta OPP', async () => {
    await abrir();
    expect(fixture.componentInstance['indiceActivoVisible']()).toBe(1);
    expect(fixture.nativeElement.querySelector('#asunto_carta')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#carta_opp_numero')).toBeNull();
    expect(boton('Guardar cambios')).toBeDefined();
  });

  it('permite pasar de la carta emitida a la respuesta OPP en Resolución', async () => {
    esperarOpp();
    pasoQuery = '1';
    await abrir();
    expect(fixture.nativeElement.textContent).not.toContain('Registrar Respuesta OPP');
    fixture.componentInstance['cambiarPaso'](2);
    fixture.detectChanges();
    expect(fixture.componentInstance['indiceActivoVisible']()).toBe(2);
    expect(fixture.nativeElement.querySelector('#carta_opp_numero')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Artículo de prueba');
  });

  it('genera desde el paso 2 y permanece allí aunque la URL indique el paso 1', async () => {
    pasoQuery = '0';
    await abrir();
    const componente = fixture.componentInstance;
    componente['cambiarPaso'](1);
    componente['cartaForm'].patchValue({ numero_completo: 'CARTA Nº 0067-2026-VRIN-UNAMBA',
      fecha: new Date(2026, 9, 5), asunto: 'Asunto de prueba', registro_mp_numero: '123-2026',
      fecha_aceptacion: new Date(2026, 9, 2) });
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(api.generarCarta).not.toHaveBeenCalled();
    expect(componente['vistaCartaVrinVisible']()).toBe(true);
    componente['generarCarta']();
    fixture.detectChanges();
    expect(api.generarCarta).toHaveBeenCalledWith(1, expect.objectContaining({
      numero: 67, anio: 2026, asunto: 'Asunto de prueba', fecha_aceptacion: '2026-10-02',
    }));
    expect(componente['indiceActivoVisible']()).toBe(1);
    expect(boton('Volver a expedientes')).toBeDefined();
  });

  it('guarda la respuesta en el paso 3 y habilita la resolución sin volver al paso 2', async () => {
    esperarOpp();
    await abrir();
    expect(fixture.componentInstance['indiceActivoVisible']()).toBe(2);
    fixture.componentInstance['oppForm'].patchValue({ disponibilidad: 'SI', monto_aprobado: 1500,
      meta_presupuestal: '017', especifica_gasto: '2.3', fuente_financiamiento: 'Recursos',
      carta_numero: '017-OPP', carta_fecha: new Date(2026, 9, 5),
      registro_vrin_numero: '123', registro_vrin_fecha: new Date(2026, 9, 5) });
    fixture.detectChanges();
    boton('Guardar Respuesta').click();
    fixture.detectChanges();
    expect(api.registrarRespuestaOpp).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['indiceActivoVisible']()).toBe(2);
    expect(boton('Generar Resolución Final')).toBeDefined();
  });

  it('abre el PDF generado en el modal cuando termina la conversión', async () => {
    esperarOpp();
    pasoQuery = '1';
    detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
      pdf_path: null, es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
    await abrir();
    expect(documentos.obtenerBlob).not.toHaveBeenCalled();
    detalle = { ...detalle, documentos_generados: [{ ...detalle.documentos_generados[0], pdf_path: 'carta.pdf' }] };
    fixture.componentInstance['cargar'](1, true);
    fixture.componentInstance['verVersionCarta'](detalle.documentos_generados[0]);
    fixture.detectChanges();
    expect(fixture.componentInstance['urlVersionCarta']()).not.toBeNull();
    expect(fixture.componentInstance['vistaBorrador']()).toBe(false);
    expect(fixture.nativeElement.querySelector('.columna-derecha iframe')).toBeNull();
    expect(documentos.obtenerBlob).toHaveBeenCalledWith(1, 9, 'pdf');
  });

  it('permite reintentar la descarga de una versión sin perder la selección', async () => {
    esperarOpp();
    pasoQuery = '1';
    detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
      pdf_path: 'carta.pdf', es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
    await abrir();
    documentos.obtenerBlob.mockReturnValueOnce(throwError(() => new Error('Error de red')));
    fixture.componentInstance['verVersionCarta'](detalle.documentos_generados[0]);
    expect(fixture.componentInstance['errorVersionCarta']()).toBe(true);
    fixture.componentInstance['verVersionCarta'](detalle.documentos_generados[0]);
    expect(fixture.componentInstance['errorVersionCarta']()).toBe(false);
    expect(fixture.componentInstance['urlVersionCarta']()).not.toBeNull();
  });

  it('cancela la edición y restaura los datos de la carta vigente', async () => {
    esperarOpp();
    pasoQuery = '1';
    detalle.carta_vrin!.asunto = 'Asunto vigente';
    detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
      pdf_path: 'carta.pdf', es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
    await abrir();
    const componente = fixture.componentInstance;
    componente['editarCarta']();
    expect(componente['cartaForm'].valid).toBe(false);
    expect(componente['cartaForm'].controls.numero_completo.valid).toBe(true);
    componente['cartaForm'].patchValue({ asunto: 'Cambio sin guardar' });
    componente['descartarCarta']();
    expect(componente['editandoCarta']()).toBe(false);
    expect(componente['cartaForm'].controls.asunto.value).toBe('Asunto vigente');
    expect(cartas.actualizar).not.toHaveBeenCalled();
  });

  it('guarda la edición como nueva versión y conserva el formulario ante un error', async () => {
    esperarOpp();
    pasoQuery = '1';
    detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
      pdf_path: 'carta.pdf', es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
    await abrir();
    const componente = fixture.componentInstance;
    componente['editarCarta']();
    componente['cartaForm'].patchValue({ asunto: 'Asunto nuevo', registro_mp_numero: '123', fecha_aceptacion: new Date(2026, 9, 2) });
    componente['confirmarGenerarCarta']();
    cartas.actualizar.mockReturnValueOnce(throwError(() => new Error('Conflicto')));
    componente['generarCarta']();
    expect(cartas.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({ version_actual: 1, asunto: 'Asunto nuevo' }));
    expect(api.generarCarta).not.toHaveBeenCalled();
    expect(componente['editandoCarta']()).toBe(true);
    expect(componente['vistaCartaVrinVisible']()).toBe(true);
    expect(componente['guardandoCarta']()).toBe(false);
    cartas.actualizar.mockReturnValueOnce(of({}));
    componente['generarCarta']();
    expect(componente['editandoCarta']()).toBe(false);
    expect(componente['vistaCartaVrinVisible']()).toBe(false);
  });

  it('envía la versión que se empezó a editar aunque el detalle se actualice', async () => {
    esperarOpp();
    pasoQuery = '1';
    detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
      pdf_path: 'carta.pdf', es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
    await abrir();
    const componente = fixture.componentInstance;
    componente['editarCarta']();
    componente['cartaForm'].patchValue({ asunto: 'Mi edición', registro_mp_numero: '123', fecha_aceptacion: new Date(2026, 9, 2) });
    detalle = { ...detalle, documentos_generados: [{ ...detalle.documentos_generados[0], id: 10, version: 2 }] };
    componente['cargar'](1, true);
    cartas.actualizar.mockReturnValueOnce(throwError(() => new Error('Conflicto')));
    componente['generarCarta']();
    expect(cartas.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({ version_actual: 1 }));
    expect(componente['cartaForm'].controls.asunto.value).toBe('Mi edición');
  });

  it('mantiene la respuesta OPP en consulta para usuarios sin permiso de registro', async () => {
    esperarOpp();
    detalle.transiciones_disponibles = [];
    await abrir();
    expect(fixture.nativeElement.querySelector('#carta_opp_numero')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pendiente de registro por Secretaría');
    expect(api.registrarRespuestaOpp).not.toHaveBeenCalled();
  });
});
