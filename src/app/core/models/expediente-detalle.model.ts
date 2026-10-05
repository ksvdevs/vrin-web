// Fase 3 — shape de GET /api/expedientes/{id} (ExpedienteController@show).
import { EstadoExpediente } from './expediente.model';

export interface ArchivoDetalle {
  id: number;
  tipo: string;
  etapa: number;
  nombre_original: string;
  mime: string | null;
  tamano_bytes: number;
  sha256: string | null;
  created_at: string;
}

export interface ObservacionDetalle {
  id: number;
  etapa: number;
  origen: string;
  texto: string;
  resuelta_at: string | null;
  created_at: string;
}

export interface TransicionDisponible {
  destino: EstadoExpediente;
  accion: { clave: string; etiqueta: string } | null;
  habilitada: boolean;
}

export interface DocumentoGeneradoDetalle {
  id: number;
  tipo: 'CARTA_VRIN' | 'RESOLUCION';
  version: number;
  pdf_path: string | null;
  es_vigente: boolean;
  generado_at: string;
  plantilla: { codigo: string; version: number } | null;
}

export interface ExpedienteDetalle {
  id: number;
  codigo: string;
  modulo: string;
  estado: EstadoExpediente;
  etapa: number | null;
  badge: { label: string; severity: string };
  etapa_actual: number;
  documentos_completos: boolean;
  carta_docente_numero: string;
  carta_docente_fecha: string;
  registro_mp_numero: string | null;
  cerrado_at: string | null;
  fecha_registro: string;
  docente: {
    id: number;
    nombre_completo: string;
    dni: string;
    grado: string;
    tipo_contrato: string;
    email: string | null;
    escuela: { id: number; nombre: string } | null;
    facultad: { id: number; nombre: string } | null;
  } | null;
  articulo: {
    titulo: string;
    revista: string;
    base_indexadora: string;
    cuartil: string;
    monto_solicitado: number;
    doi: string | null;
    fecha_aceptacion?: string | null;
  } | null;
  validacion_calidad: {
    resultado: string;
    checklist: Record<string, boolean> | null;
    observacion: string | null;
    validado_at: string | null;
    validado_por: string | null;
  } | null;
  carta_vrin: {
    numero: string;
    anio: number;
    fecha: string | null;
    ciudad: string | null;
    asunto?: string | null;
    estado: string | null;
    emitida_por: string | null;
  } | null;
  respuesta_opp: {
    disponibilidad: 'SI' | 'NO' | null;
    carta_numero: string | null;
    carta_fecha: string | null;
    monto_aprobado: number | null;
    meta_presupuestal: string | null;
    especifica_gasto: string | null;
    fuente_financiamiento: string | null;
    registro_vrin_numero: string | null;
    registro_vrin_fecha: string | null;
    registrado_por: string | null;
  } | null;
  resolucion: {
    numero: string;
    anio: number;
    fecha_emision: string | null;
    estado: string | null;
    emitida_por: string | null;
  } | null;
  rendicion: {
    fecha_desembolso: string | null;
    fecha_limite: string | null;
    fecha_informe: string | null;
    estado: string | null;
    dias_habiles_restantes: number;
    con_retraso: boolean;
    cerrada_at: string | null;
    cerrada_por: string | null;
  } | null;
  archivos: ArchivoDetalle[];
  observaciones: ObservacionDetalle[];
  transiciones_disponibles: TransicionDisponible[];
  documentos_generados: DocumentoGeneradoDetalle[];
}

export interface ValidacionPayload {
  resultado: 'CUMPLE' | 'NO_CUMPLE';
  checklist: {
    carta_aceptacion: boolean;
    docente_ordinario_contratado: boolean;
    afiliacion_universidad: boolean;
  };
  observacion?: string | null;
}
