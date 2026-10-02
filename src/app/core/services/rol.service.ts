import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Rol } from '../models/rol.model';
import { ApiService } from './api.service';

export interface FiltrosRol {
  nombre?: string;
  activo?: number;
}

export interface RolPayload {
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class RolService {
  private readonly api = inject(ApiService);

  listar(filtros: FiltrosRol = {}): Observable<Rol[]> {
    const params: Record<string, string | number> = {};
    if (filtros.nombre) {
      params['nombre'] = filtros.nombre;
    }
    if (filtros.activo !== undefined && filtros.activo !== null) {
      params['activo'] = filtros.activo;
    }
    return this.api.get<Rol[]>('/roles', params);
  }

  crear(payload: RolPayload): Observable<Rol> {
    return this.api.post<Rol>('/roles', payload);
  }

  actualizar(id: number, payload: RolPayload): Observable<Rol> {
    return this.api.put<Rol>(`/roles/${id}`, payload);
  }

  eliminar(id: number): Observable<void> {
    return this.api.delete<void>(`/roles/${id}`);
  }
}
