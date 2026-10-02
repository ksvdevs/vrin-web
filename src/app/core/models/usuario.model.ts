export interface Usuario {
  id: number;
  dni: string;
  nombres: string;
  apellidos: string;
  nombre: string;
  email: string;
  rol: string;
  rol_codigo: string;
  rol_id: number;
  activo: boolean;
  ultimo_login_at: string | null;
  created_at?: string;
}
