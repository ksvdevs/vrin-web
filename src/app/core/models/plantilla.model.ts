// Fase 5 — gestor de plantillas y selección vigente (RN-13).
export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Plantilla {
  id: number;
  codigo: string;
  nombre: string;
  modulo: string;
  tipo_documento: TipoDocumento | null;
  version: number;
  estado: 'ACTIVO' | 'INACTIVO';
  tokens_count: number;
  sin_mapeo: string[];
  sha256: string;
  created_at: string;
}

export interface SeleccionPlantilla {
  modulo: string;
  tipo_documento: TipoDocumento | null;
  plantilla: { id: number; codigo: string; nombre: string; version: number } | null;
  seleccionado_at: string;
}
