import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NEVER, of, throwError } from 'rxjs';
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
  const resoluciones = { sugerencia: () => of({ siguiente_numero: 13 }), preview: vi.fn() };
  const documentos = { obtenerBlob: vi.fn() };
  const archivos = { obtenerBlob: vi.fn() };
  const api = {
    obtener: vi.fn(),
    generarCarta: vi.fn(),
    registrarRespuestaOpp: vi.fn(),
    actualizarRespuestaOpp: vi.fn(),
    actualizarResolucion: vi.fn(),
    subirArchivo: vi.fn(),
    registrarDesembolso: vi.fn(),
    cerrarRendicion: vi.fn(),
    retirarComprobante: vi.fn(),
    analizarCartaOpp: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:carta-vrin');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    documentos.obtenerBlob.mockReturnValue(of(new Blob(['PDF'], { type: 'application/pdf' })));
    archivos.obtenerBlob.mockReturnValue(of(new Blob(['PDF'], { type: 'application/pdf' })));
    cartas.preview.mockReturnValue(of(new Blob(['PDF'], { type: 'application/pdf' })));
    resoluciones.preview.mockReturnValue(of(new Blob(['PDF'], { type: 'application/pdf' })));
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
        { provide: ResolucionService, useValue: resoluciones },
        { provide: ArchivoService, useValue: archivos },
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

  it('registra fecha y monto de desembolso desde el paso 4', async () => {
    pasoQuery = '3';
    detalle.estado = 'RESOLUCION_EMITIDA';
    detalle.etapa_actual = 4;
    api.registrarDesembolso.mockReturnValue(NEVER);
    await abrir();

    expect(fixture.nativeElement.querySelector('.rendicion-principal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.resumen-solicitud')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#monto_desembolsado')).not.toBeNull();
    boton('Registrar y activar plazo').click();
    fixture.detectChanges();

    expect(api.registrarDesembolso).toHaveBeenCalledWith(1, {
      fecha_desembolso: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      monto_desembolsado: 1500,
    });
  });

  it('exige comprobantes y permite subir un PDF antes de cerrar la rendición', async () => {
    pasoQuery = '3';
    detalle.estado = 'POR_RENDIR';
    detalle.etapa_actual = 4;
    detalle.rendicion = {
      fecha_desembolso: '2026-10-07', monto_desembolsado: 1500, fecha_limite: '2026-12-30',
      fecha_informe: null, estado: 'BORRADOR', dias_habiles_restantes: 60,
      con_retraso: false, cerrada_at: null, cerrada_por: null,
    };
    api.subirArchivo.mockReturnValue(NEVER);
    await abrir();

    expect(boton('Confirmar y cerrar rendición').disabled).toBe(true);
    const input = fixture.nativeElement.querySelector('#comprobante-rendicion') as HTMLInputElement;
    const archivo = new File(['PDF'], 'comprobante.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { configurable: true, value: [archivo] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    boton('Subir').click();

    expect(api.subirArchivo).toHaveBeenCalledWith(1, archivo, 'COMPROBANTE_RENDICION', 4);
  });

  it('muestra el comprobante cargado y permite cerrar con una fecha posterior al desembolso', async () => {
    pasoQuery = '3';
    detalle.estado = 'POR_RENDIR';
    detalle.etapa_actual = 4;
    detalle.rendicion = {
      fecha_desembolso: '2026-10-10', monto_desembolsado: 1500, fecha_limite: '2027-01-05',
      fecha_informe: null, estado: 'BORRADOR', dias_habiles_restantes: 60,
      con_retraso: false, cerrada_at: null, cerrada_por: null,
    };
    api.subirArchivo.mockImplementation(() => {
      detalle = { ...detalle, archivos: [{
        id: 25, tipo: 'COMPROBANTE_RENDICION', etapa: 4, nombre_original: 'pago.pdf',
        mime: 'application/pdf', tamano_bytes: 123, sha256: null, created_at: '2026-10-10',
      }] };
      return of({ id: 25, nombre_original: 'pago.pdf', mime: 'application/pdf', tamano_bytes: 123 });
    });
    api.cerrarRendicion.mockReturnValue(of({ estado: 'RENDIDO' }));
    await abrir();

    expect(fixture.componentInstance['rendicionForm'].controls.fecha_informe.value?.getDate()).toBe(10);
    const input = fixture.nativeElement.querySelector('#comprobante-rendicion') as HTMLInputElement;
    const archivo = new File(['PDF'], 'pago.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { configurable: true, value: [archivo] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    boton('Subir').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('pago.pdf');
    expect(boton('Confirmar y cerrar rendición').disabled).toBe(false);
    const confirmar = TestBed.inject(ConfirmationService);
    vi.spyOn(confirmar, 'confirm').mockImplementation((opciones) => {
      opciones.accept?.();
      return confirmar;
    });
    boton('Confirmar y cerrar rendición').click();
    expect(api.cerrarRendicion).toHaveBeenCalledWith(1, { fecha_informe: '2026-10-10' });
  });

  it('mantiene los cuatro pasos completos y destaca el paso consultado al navegar', async () => {
    pasoQuery = '1';
    detalle.estado = 'RENDIDO';
    detalle.etapa_actual = 4;
    detalle.rendicion = {
      fecha_desembolso: '2026-10-07', monto_desembolsado: 1500, fecha_limite: '2026-12-30',
      fecha_informe: '2026-10-22', estado: 'CERRADA', dias_habiles_restantes: 0,
      con_retraso: false, cerrada_at: '2026-10-22', cerrada_por: 'Secretaría',
    };
    await abrir();

    const obtenerPasos = () => Array.from(fixture.nativeElement.querySelectorAll('.pasos-solicitud button')) as HTMLButtonElement[];
    expect(obtenerPasos()).toHaveLength(4);
    expect(obtenerPasos().every((paso) => paso.classList.contains('terminado') && !!paso.querySelector('.pi-check'))).toBe(true);
    expect(obtenerPasos()[1].classList.contains('activo-completado')).toBe(true);
    expect(obtenerPasos()[1].getAttribute('aria-current')).toBe('step');
    obtenerPasos()[2].click();
    fixture.detectChanges();
    expect(obtenerPasos()[2].classList.contains('activo-completado')).toBe(true);
    expect(obtenerPasos()[1].classList.contains('terminado')).toBe(true);
    expect(obtenerPasos()[1].classList.contains('activo-completado')).toBe(false);
  });

  it('abre el paso 2 con una opción visible para editar la carta vigente', async () => {
    esperarOpp();
    detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
      pdf_path: 'carta.pdf', es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
    await abrir();
    expect(fixture.componentInstance['indiceActivoVisible']()).toBe(1);
    const filaCarta = fixture.nativeElement.querySelector('.documento-generado') as HTMLElement;
    expect(filaCarta.querySelector('button[aria-label="Editar información de la carta"]')).toBeNull();
    const acciones = fixture.nativeElement.querySelectorAll('.acciones-carta-secundarias button') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(acciones, (accion) => accion.textContent?.trim())).toEqual(['Editar información', 'Ver carta generada']);
    const editar = acciones[0];
    editar.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['editandoCarta']()).toBe(true);
    expect(boton('Cancelar edición')).toBeDefined();
    expect(fixture.nativeElement.textContent).toContain('Se creará una nueva versión');
  });

  it.each(['DISPONIBILIDAD_CONFIRMADA', 'RESOLUCION_EMITIDA'] as const)(
    'mantiene Editar información junto a Ver carta generada en %s', async (estado) => {
      esperarOpp();
      pasoQuery = '1';
      detalle.estado = estado;
      detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
        pdf_path: 'carta.pdf', es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
      await abrir();
      const acciones = fixture.nativeElement.querySelectorAll('.acciones-carta-secundarias button') as NodeListOf<HTMLButtonElement>;
      expect(Array.from(acciones, (accion) => accion.textContent?.trim())).toEqual(['Editar información', 'Ver carta generada']);
      expect(fixture.nativeElement.querySelector('.resumen-titulo button[aria-label="Editar información de la carta"]')).toBeNull();
      acciones[0].click();
      fixture.detectChanges();
      expect(fixture.componentInstance['editandoCarta']()).toBe(true);
    },
  );

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
    expect(fixture.componentInstance['indiceActivoVisible']()).toBe(1);
    fixture.componentInstance['cambiarPaso'](2);
    fixture.detectChanges();
    expect(fixture.componentInstance['indiceActivoVisible']()).toBe(2);
    expect(fixture.nativeElement.querySelector('.resumen-expediente')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Preparar resolución VRIN');
    fixture.componentInstance['oppForm'].patchValue({ disponibilidad: 'SI', monto_aprobado: 1500,
      meta_presupuestal: '017', especifica_gasto: '2.3', fuente_financiamiento: 'Recursos',
      carta_numero: '017-OPP', carta_fecha: new Date(2026, 9, 5),
      registro_vrin_numero: '123', registro_vrin_fecha: new Date(2026, 9, 5) });
    fixture.detectChanges();
    boton('Guardar cambios').click();
    fixture.detectChanges();
    expect(api.registrarRespuestaOpp).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['indiceActivoVisible']()).toBe(2);
    expect(resoluciones.preview).toHaveBeenCalledWith(1, expect.objectContaining({ numero: 13 }));
    expect(boton('Generar y guardar resolución')).toBeDefined();
  });

  it('solicita el PDF al abrir la carta aunque la conversión siga pendiente', async () => {
    esperarOpp();
    pasoQuery = '1';
    detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
      pdf_path: null, es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
    await abrir();
    expect(documentos.obtenerBlob).not.toHaveBeenCalled();
    fixture.componentInstance['verVersionCarta'](detalle.documentos_generados[0]);
    fixture.detectChanges();
    expect(fixture.componentInstance['urlVersionCarta']()).not.toBeNull();
    expect(fixture.componentInstance['vistaBorrador']()).toBe(false);
    expect(fixture.nativeElement.querySelector('.columna-derecha iframe')).toBeNull();
    expect(documentos.obtenerBlob).toHaveBeenCalledWith(1, 9, 'pdf');
  });

  it('carga los datos al editar una resolución emitida y descarga la versión en Word', async () => {
    esperarOpp();
    pasoQuery = '2';
    detalle.estado = 'RESOLUCION_EMITIDA';
    detalle.etapa_actual = 3;
    detalle.respuesta_opp = { disponibilidad: 'SI', carta_numero: '017-OPP', carta_fecha: '2026-10-05',
      monto_aprobado: 1500, meta_presupuestal: '017', especifica_gasto: '2.3',
      fuente_financiamiento: 'Recursos', registro_vrin_numero: '123',
      registro_vrin_fecha: '2026-10-06', registrado_por: 'Secretaría' };
    detalle.resolucion = { numero: '13', anio: 2026, fecha_emision: '2026-10-07', estado: 'EMITIDA', emitida_por: 'Secretaría' };
    detalle.documentos_generados = [{ id: 10, tipo: 'RESOLUCION', version: 2,
      pdf_path: 'resolucion.pdf', es_vigente: true, generado_at: '2026-10-07', plantilla: null }];
    await abrir();
    expect(fixture.nativeElement.textContent).toContain('Resolución · Versión 2.docx');
    boton('Editar información').click();
    fixture.detectChanges();
    expect(fixture.componentInstance['oppForm'].controls.carta_numero.value).toBe('017-OPP');
    expect(fixture.componentInstance['resolucionForm'].controls.numero.value).toBe(13);
    expect(fixture.nativeElement.querySelector('#res_numero')).not.toBeNull();
    api.actualizarRespuestaOpp.mockReturnValue(of({ estado: 'RESOLUCION_EMITIDA' }));
    api.actualizarResolucion.mockReturnValue(of({}));
    fixture.componentInstance['guardarRespuestaOpp']();
    expect(api.actualizarRespuestaOpp).toHaveBeenCalledWith(1, expect.objectContaining({ carta_numero: '017-OPP' }));
    expect(resoluciones.preview).toHaveBeenCalledWith(1, expect.objectContaining({ numero: 13 }));
    fixture.componentInstance['generarResolucion']();
    expect(api.actualizarResolucion).toHaveBeenCalledWith(1, expect.objectContaining({ numero: 13 }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    (fixture.nativeElement.querySelector('button[aria-label="Descargar resolución en Word (.docx)"]') as HTMLButtonElement).click();
    expect(documentos.obtenerBlob).toHaveBeenCalledWith(1, 10, 'docx', false);
  });

  it('usa la IA de la carta OPP para proponer datos editables antes de guardar', async () => {
    esperarOpp();
    pasoQuery = '2';
    api.subirArchivo.mockReturnValue(of({ nombre_original: 'respuesta.pdf' }));
    api.analizarCartaOpp.mockReturnValue(of({ datos: {
      disponibilidad: 'SI', monto_aprobado: 1500, meta_presupuestal: '017',
      especifica_gasto: '2.3.27.11', fuente_financiamiento: 'Recursos ordinarios',
      carta_numero: '017-2026-OPP', carta_fecha: '2026-10-05',
      registro_vrin_numero: '1538-2026-VRIN', registro_vrin_fecha: '2026-10-06',
    }, nombre_archivo: 'respuesta.pdf' }));
    await abrir();
    const archivo = new File(['carta'], 'respuesta.pdf', { type: 'application/pdf' });
    const selector = fixture.nativeElement.querySelector('#archivo_opp') as HTMLInputElement;
    Object.defineProperty(selector, 'files', { configurable: true, value: [archivo] });
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.etiqueta-archivo-opp')?.textContent).toContain('PDF');
    expect(fixture.nativeElement.querySelector('.nombre-archivo-opp')?.textContent).toContain('respuesta.pdf');
    fixture.componentInstance['subirEscaneoOpp']();
    expect(api.subirArchivo).toHaveBeenCalledWith(1, archivo, 'CARTA_OPP', 3);
    expect(api.analizarCartaOpp).toHaveBeenCalledWith(1, archivo);
    expect(fixture.componentInstance['oppForm'].controls.carta_numero.value).toBe('017-2026-OPP');
    expect(fixture.componentInstance['oppForm'].controls.meta_presupuestal.value).toBe('017');
    expect(fixture.componentInstance['oppForm'].controls.carta_fecha.value?.getFullYear()).toBe(2026);
  });

  it('permite corregir la respuesta OPP guardada antes de emitir la resolución', async () => {
    esperarOpp();
    detalle = { ...detalle, estado: 'DISPONIBILIDAD_CONFIRMADA', etapa_actual: 3,
      respuesta_opp: { disponibilidad: 'SI', monto_aprobado: 1500, meta_presupuestal: '017',
        especifica_gasto: '2.3', fuente_financiamiento: 'Recursos', carta_numero: '017-OPP',
        carta_fecha: '2026-10-05', registro_vrin_numero: '1538-VRIN', registro_vrin_fecha: '2026-10-06', registrado_por: 'Secretaría' },
      resolucion_borrador: { numero: 13, anio: 2026, fecha_emision: '2026-10-07' },
      transiciones_disponibles: [{ destino: 'RESOLUCION_EMITIDA', accion: { clave: 'generar_resolucion', etiqueta: 'Generar resolución' }, habilitada: true }],
    };
    api.actualizarRespuestaOpp.mockReturnValue(of({ estado: 'DISPONIBILIDAD_CONFIRMADA', etapa_actual: 3 }));
    await abrir();
    expect(boton('Editar información')).toBeDefined();
    boton('Editar información').click();
    fixture.detectChanges();
    expect(fixture.componentInstance['oppForm'].controls.meta_presupuestal.value).toBe('017');
    fixture.componentInstance['oppForm'].controls.meta_presupuestal.setValue('018');
    fixture.detectChanges();
    boton('Guardar cambios').click();
    expect(api.actualizarRespuestaOpp).toHaveBeenCalledWith(1, expect.objectContaining({ meta_presupuestal: '018', resolucion_numero: 13 }));
  });

  it('permite volver a comprobar el PDF sin cerrar la vista de la carta', async () => {
    esperarOpp();
    detalle.documentos_generados = [{ id: 9, tipo: 'CARTA_VRIN', version: 1,
      pdf_path: null, es_vigente: true, generado_at: '2026-10-06', plantilla: null }];
    await abrir();
    documentos.obtenerBlob.mockReturnValue(NEVER);
    fixture.componentInstance['verVersionCarta'](detalle.documentos_generados[0]);
    fixture.componentInstance['cargandoVersionCarta'].set(false);
    fixture.componentInstance['esperaVistaCartaAgotada'].set(true);
    fixture.detectChanges();
    boton('Volver a comprobar').click();
    fixture.detectChanges();
    expect(fixture.componentInstance['vistaCartaVrinVisible']()).toBe(true);
    expect(fixture.componentInstance['esperaVistaCartaAgotada']()).toBe(false);
  });

  it('no vuelve a pedir la carta docente en cada consulta del expediente', async () => {
    detalle.archivos = [{ id: 2, tipo: 'CARTA_DOCENTE', etapa: 1,
      nombre_original: 'CARTA_DOCENTE_N°047.pdf', mime: 'application/pdf', tamano_bytes: 120,
      sha256: null, created_at: '2026-10-06' }];
    await abrir();
    fixture.componentInstance['cargar'](1, true);
    expect(archivos.obtenerBlob).toHaveBeenCalledTimes(1);
    expect(archivos.obtenerBlob).toHaveBeenCalledWith(1, 2);
  });

  it('descarga la versión elegida en DOCX aunque su vista PDF siga pendiente', async () => {
    esperarOpp();
    pasoQuery = '1';
    detalle.documentos_generados = [
      { id: 10, tipo: 'CARTA_VRIN', version: 2, pdf_path: 'carta-v2.pdf', es_vigente: true, generado_at: '2026-10-07', plantilla: null },
      { id: 9, tipo: 'CARTA_VRIN', version: 1, pdf_path: null, es_vigente: false, generado_at: '2026-10-06', plantilla: null },
    ];
    await abrir();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fixture.componentInstance['descargarDocGenerado'](detalle.documentos_generados[1]);
    expect(documentos.obtenerBlob).toHaveBeenCalledWith(1, 9, 'docx', true);
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
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
    fixture.componentInstance['cambiarPaso'](2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#carta_opp_numero')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pendiente de registro por Secretaría');
    expect(api.registrarRespuestaOpp).not.toHaveBeenCalled();
  });
});
