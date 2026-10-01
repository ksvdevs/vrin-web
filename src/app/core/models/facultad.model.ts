import { Escuela } from './escuela.model';

export interface Facultad {
  id: number;
  nombre: string;
  escuelas?: Escuela[];
}

export interface FacultadPayload {
  nombre: string;
}
