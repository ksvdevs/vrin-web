import { Escuela } from './escuela.model';

export const GRADOS = [
  'Dr.',
  'Dra.',
  'Mg.',
  'M.Sc.',
  'Ph.D.',
  'CPC',
  'Ing.',
  'Lic.',
  'Abog.',
  'Otro',
] as const;

export type Grado = (typeof GRADOS)[number];

export const TIPOS_CONTRATO = ['NOMBRADO', 'CONTRATADO'] as const;

export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export interface Docente {
  id: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  grado: Grado;
  tipo_contrato: TipoContrato;
  escuela_id: number;
  email?: string | null;
  activo: boolean;
  escuela?: Escuela;
}

export interface DocentePayload {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  grado: Grado;
  tipo_contrato: TipoContrato;
  escuela_id: number;
  email?: string | null;
  activo?: boolean;
}
