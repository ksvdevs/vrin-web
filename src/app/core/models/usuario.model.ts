export type Rol = 'ADMINISTRADOR' | 'SECRETARIA' | 'CALIDAD';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}
