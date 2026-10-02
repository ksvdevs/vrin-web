export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at?: string;
}
