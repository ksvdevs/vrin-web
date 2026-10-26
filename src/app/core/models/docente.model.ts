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

export const GENEROS = ['MASCULINO', 'FEMENINO', 'OTRO'] as const;

export type Genero = (typeof GENEROS)[number];

export const CATEGORIAS = [
  'ORDINARIO_PRINCIPAL',
  'ORDINARIO_ASOCIADO',
  'ORDINARIO_AUXILIAR',
  'CONTRATADO',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export interface Docente {
  id: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  genero: Genero | null;
  celular?: string | null;
  grado: Grado;
  tipo_contrato: TipoContrato;
  categoria: Categoria | null;
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
  genero: Genero | null;
  celular?: string | null;
  grado: Grado;
  categoria: Categoria | null;
  escuela_id: number;
  email?: string | null;
  activo: boolean;
}
