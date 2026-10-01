import { Facultad } from './facultad.model';

export interface Escuela {
  id: number;
  nombre: string;
  facultad_id?: number;
  facultad?: Facultad;
}

export interface EscuelaPayload {
  facultad_id: number;
  nombre: string;
}
