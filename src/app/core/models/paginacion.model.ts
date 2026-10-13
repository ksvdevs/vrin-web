// Respuesta paginada estándar de Laravel (LengthAwarePaginator).
export interface RespuestaPaginada<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}
