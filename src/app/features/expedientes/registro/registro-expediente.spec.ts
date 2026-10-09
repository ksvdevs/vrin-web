import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Docente } from '../../../core/models/docente.model';
import { ExpedienteDetalle } from '../../../core/models/expediente-detalle.model';
import { AuthService } from '../../../core/services/auth.service';
import { ArchivoService } from '../../../core/services/archivo.service';
import { DocenteService } from '../../../core/services/docente.service';
import { ExpedienteService } from '../../../core/services/expediente.service';
import { RegistroExpediente } from './registro-expediente';

describe('Asociación del docente extraído de la carta', () => {
  const docente: Docente = {
    id: 1, dni: '77100101', nombres: 'Delmer', apellido_paterno: 'Zea', apellido_materno: 'Gonzales',
    grado: 'Dr.', tipo_contrato: 'NOMBRADO', escuela_id: 1, activo: true,
    escuela: { id: 1, nombre: 'Escuela', facultad_id: 1, facultad: { id: 1, nombre: 'Facultad' } } as Docente['escuela'],
  };
  let buscarPorNombre: ReturnType<typeof vi.fn>;
  let obtener: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    buscarPorNombre = vi.fn((q: string) => of(q === 'Delmer Zea' || q.includes('Gonzales') ? [docente] : []));
    obtener = vi.fn();
    await TestBed.configureTestingModule({
      imports: [RegistroExpediente],
      providers: [
        provideRouter([]), MessageService, ConfirmationService,
        { provide: AuthService, useValue: { verificarSesion: () => of(true) } },
        { provide: ArchivoService, useValue: {} },
        { provide: ExpedienteService, useValue: { obtener } },
        { provide: DocenteService, useValue: { buscarPorNombre } },
      ],
    }).overrideComponent(RegistroExpediente, { set: { template: '' } }).compileComponents();
  });

  function abrir(): RegistroExpediente {
    const fixture = TestBed.createComponent(RegistroExpediente);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('selecciona al docente por nombre completo aunque el OCR invierta el orden', () => {
    const componente = abrir();
    componente['aplicarOcr']({ docente_nombre: 'Zea Gonzales, Delmer' });
    expect(buscarPorNombre).toHaveBeenCalledWith('Zea Gonzales Delmer');
    expect(componente['formulario'].controls.docente.value?.valor.id).toBe(1);
  });

  it('selecciona una coincidencia única por nombre y apellido', () => {
    const componente = abrir();
    componente['aplicarOcr']({ docente_nombre: 'Delmer Zea' });
    expect(componente['formulario'].controls.docente.value?.valor.id).toBe(1);
  });

  it('completa el registro de la carta desde OCR y exige el dato antes de continuar', () => {
    const componente = abrir();
    componente['aplicarOcr']({ carta_docente_registro_numero: '1392-2026', carta_docente_registro_fecha: '2026-10-02' });
    expect(componente['formulario'].controls.carta_docente_registro_numero.value).toBe('1392-2026');
    expect(componente['formulario'].controls.carta_docente_registro_fecha.value).toEqual(new Date(2026, 9, 2));
    componente['formulario'].controls.carta_docente_registro_numero.setValue('');
    expect(componente['formulario'].controls.carta_docente_registro_numero.invalid).toBe(true);
    componente['formulario'].controls.carta_docente_registro_numero.setValue('   ');
    expect(componente['formulario'].controls.carta_docente_registro_numero.invalid).toBe(true);
  });

  it('al editar muestra la facultad y conserva la fecha de registro de la carta', () => {
    obtener.mockReturnValue(of({
      carta_docente_numero: '017-2026', carta_docente_fecha: '2026-07-14',
      carta_docente_registro_numero: '1392-2026', carta_docente_registro_fecha: '2026-07-15',
      documentos_completos: true, archivos: [],
      docente: {
        id: 1, nombre_completo: 'M.Sc. Delmer Zea Gonzales', dni: '77100101',
        grado: 'M.Sc.', tipo_contrato: 'NOMBRADO', email: null,
        escuela: { id: 1, nombre: 'Medicina Veterinaria y Zootecnia' },
        facultad: { id: 4, nombre: 'Medicina Veterinaria' },
      },
    } as unknown as ExpedienteDetalle));
    const componente = abrir();
    componente['cargarParaEdicion'](7);
    expect(componente['facultadDocente']()).toBe('Medicina Veterinaria');
    expect(componente['docenteSeleccionado']()?.escuela?.facultad?.id).toBe(4);
    expect(componente['formulario'].controls.carta_docente_registro_fecha.value).toEqual(new Date(2026, 6, 15));
  });

  it('solicita elección si varios docentes comparten nombre y primer apellido', () => {
    const otro = { ...docente, id: 2, dni: '77100102', apellido_materno: 'Rojas' };
    buscarPorNombre.mockReturnValue(of([docente, otro]));
    const componente = abrir();
    componente['aplicarOcr']({ docente_nombre: 'Delmer Zea' });
    expect(componente['formulario'].controls.docente.value).toBeNull();
    expect(componente['candidatosDocenteOcr']()).toHaveLength(2);
    componente['seleccionarCoincidenciaDocente'](docente);
    expect(componente['formulario'].controls.docente.value?.valor.id).toBe(1);
  });

  it('ignora el DNI extraído y no selecciona a un docente con otro nombre', () => {
    const componente = abrir();
    componente['aplicarOcr']({ docente_dni: docente.dni, docente_nombre: 'Otra Persona' });
    expect(componente['formulario'].controls.docente.value).toBeNull();
    expect(componente['candidatosDocenteOcr']()).toEqual([]);
    expect(buscarPorNombre).not.toHaveBeenCalledWith(docente.dni);
  });

  it('ofrece candidatos si la carta incluye un segundo nombre ausente del padrón', () => {
    const componente = abrir();
    componente['aplicarOcr']({ docente_nombre: 'Delmer Alberto Zea Gonzales' });
    expect(buscarPorNombre).toHaveBeenCalledWith('Zea Gonzales');
    expect(componente['formulario'].controls.docente.value).toBeNull();
    expect(componente['candidatosDocenteOcr']()).toEqual([docente]);
  });
});
