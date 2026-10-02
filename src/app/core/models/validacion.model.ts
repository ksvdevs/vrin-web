import { EstadoExpediente } from './expediente.model';

// Fase 4 — checklist de los 3 requisitos de Calidad (RN-01).
// Las claves son las columnas del JSON `validaciones_calidad.checklist`.
export interface ChecklistValidacion {
  carta_aceptacion: boolean;
  docente_ordinario_contratado: boolean;
  afiliacion_universidad: boolean;
}

export const REQUISITOS_VALIDACION: { clave: keyof ChecklistValidacion; etiqueta: string }[] = [
  { clave: 'carta_aceptacion', etiqueta: 'Carta Oficial de Aceptación' },
  { clave: 'docente_ordinario_contratado', etiqueta: 'Docente Ordinario o Contratado' },
  { clave: 'afiliacion_universidad', etiqueta: 'Afiliación a la Universidad' },
];

export interface ValidacionPayload {
  resultado: 'CUMPLE' | 'NO_CUMPLE';
  checklist: ChecklistValidacion;
  observacion?: string | null;
}

// Shape de POST /api/expedientes/{id}/validacion (ValidacionController@store).
export interface RespuestaValidacion {
  estado: EstadoExpediente;
  validacion: unknown;
}

// Shape de PATCH /api/expedientes/{id}/documentos-completos.
export interface RespuestaDocumentosCompletos {
  id: number;
  codigo: string;
  estado: EstadoExpediente;
  documentos_completos: boolean;
}
