export interface TipoDocumentoPlantilla {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export type EstadoPlantilla = 'ACTIVO' | 'INACTIVO';

export interface Plantilla {
  id: number;
  codigo: string;
  nombre: string;
  modulo: string;
  tipo_documento_id: number;
  version: number;
  archivo_path: string;
  sha256: string;
  tokens: string[];
  estado: EstadoPlantilla;
  tipo_documento?: TipoDocumentoPlantilla;
}

export interface SubidaPlantillaResponse {
  plantilla: Plantilla;
  tokens: string[];
  advertencia_tokens_sin_mapeo: string[];
}

export interface PlantillaSeleccion {
  modulo: string;
  tipo_documento_id: number;
  plantilla_id: number;
  seleccionado_por: number;
  seleccionado_at: string;
  plantilla?: Plantilla;
  tipo_documento?: TipoDocumentoPlantilla;
}

export interface SeleccionPlantillaPayload {
  modulo: string;
  tipo_documento_id: number;
  plantilla_id: number;
}
