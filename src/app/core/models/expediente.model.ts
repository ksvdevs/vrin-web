export const BASES_INDEXADORAS = ['Scopus', 'Web of Science', 'SciELO', 'Otra'] as const;

export type BaseIndexadora = (typeof BASES_INDEXADORAS)[number];

export const CUARTILES = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

export type Cuartil = (typeof CUARTILES)[number];

// Los 11 estados congelados de la tabla expedientes (D-05).
export const ESTADOS_EXPEDIENTE = [
  'OBSERVADO',
  'EN_REVISION_CALIDAD',
  'VALIDADO_CALIDAD',
  'NO_CUMPLE',
  'EN_ESPERA_OPP',
  'SIN_DISPONIBILIDAD',
  'DISPONIBILIDAD_CONFIRMADA',
  'RESOLUCION_EMITIDA',
  'POR_RENDIR',
  'RENDICION_VENCIDA',
  'RENDIDO',
] as const;

export type EstadoExpediente = (typeof ESTADOS_EXPEDIENTE)[number];

// Presentación por estado (espéjo del mapa del backend, app/Support/EstadoExpediente.php).
export const ESTADO_INFO: Record<
  EstadoExpediente,
  {
    etapa: number | null;
    label: string;
    severity: 'success' | 'warn' | 'danger';
    terminal: boolean;
  }
> = {
  OBSERVADO: { etapa: 1, label: 'Observado', severity: 'danger', terminal: false },
  EN_REVISION_CALIDAD: { etapa: 1, label: 'En revisión', severity: 'warn', terminal: false },
  VALIDADO_CALIDAD: { etapa: 1, label: 'Validado', severity: 'success', terminal: false },
  NO_CUMPLE: { etapa: 1, label: 'No cumple', severity: 'danger', terminal: true },
  EN_ESPERA_OPP: { etapa: 2, label: 'En espera OPP', severity: 'warn', terminal: false },
  SIN_DISPONIBILIDAD: { etapa: 2, label: 'Sin disponibilidad', severity: 'danger', terminal: true },
  DISPONIBILIDAD_CONFIRMADA: {
    etapa: 2,
    label: 'Disponibilidad OK',
    severity: 'success',
    terminal: false,
  },
  RESOLUCION_EMITIDA: { etapa: 3, label: 'Emitida', severity: 'success', terminal: false },
  POR_RENDIR: { etapa: 4, label: 'Por rendir', severity: 'danger', terminal: false },
  RENDICION_VENCIDA: { etapa: 4, label: 'Vencida', severity: 'danger', terminal: false },
  RENDIDO: { etapa: 4, label: 'Rendido', severity: 'success', terminal: true },
};

export interface Articulo {
  // La tabla expediente_articulos usa expediente_id como PK (relación 1:1):
  // el API no devuelve un id propio del artículo.
  id?: number;
  expediente_id: number;
  titulo: string;
  revista: string;
  base_indexadora: BaseIndexadora;
  cuartil: Cuartil;
  monto_solicitado: number;
  doi?: string | null;
}

export interface Expediente {
  id: number;
  codigo: string;
  estado: EstadoExpediente;
  carta_docente_numero: string;
  carta_docente_fecha: string;
  documentos_completos: boolean;
  docente_id: number;
  grado: string;
  tipo_contrato: string;
  escuela_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  articulo?: Articulo;
}

export interface ExpedientePayload {
  carta_docente_numero: string;
  carta_docente_fecha: string;
  docente_id: number;
  facultad_id: number;
  titulo: string;
  revista: string;
  base_indexadora: BaseIndexadora;
  cuartil: Cuartil;
  monto_solicitado: number;
  doi?: string | null;
  documentos_completos: boolean;
  confirmar_duplicado?: boolean;
}

export interface ExpedienteExistente {
  id: number;
  codigo: string;
  estado?: string;
}

export interface RespuestaDuplicidad {
  advertencia: string;
  existente: ExpedienteExistente;
}

export type RespuestaRegistroExpediente = Expediente | RespuestaDuplicidad;

export function esRespuestaDuplicidad(
  respuesta: RespuestaRegistroExpediente,
): respuesta is RespuestaDuplicidad {
  return 'advertencia' in respuesta;
}

// Fase 3 — fila de la bandeja (shape de ExpedienteResource).
export interface ExpedienteFila {
  id: number;
  codigo: string;
  fecha_registro: string;
  docente: {
    id: number;
    nombre_completo: string;
    dni: string;
  };
  titulo: string | null;
  base_indexadora?: BaseIndexadora | null;
  cuartil?: Cuartil | null;
  estado: EstadoExpediente;
  etapa: number | null;
  badge: {
    label: string;
    severity: string;
  };
  accion_principal: {
    clave: string;
    etiqueta: string;
  };
}

export interface Paginado<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}

// Respuesta de POST /articulos/ocr (extracción IA de la carta escaneada).
export interface OcrDatosCarta {
  carta_docente_numero?: string | null;
  carta_docente_fecha?: string | null;
  titulo?: string | null;
  revista?: string | null;
  base_indexadora?: string | null;
  cuartil?: string | null;
  monto_solicitado?: number | null;
  docente_dni?: string | null;
  docente_nombre?: string | null;
  doi?: string | null;
}

export interface ResultadoOcr {
  datos: OcrDatosCarta;
  confianza: Record<string, number>;
  campos_extraidos: number;
  nombre_archivo: string;
}
