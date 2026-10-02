import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Usuario } from '../models/usuario.model';
import { ApiService } from './api.service';

export interface FiltrosUsuario {
  nombre?: string;
  email?: string;
  activo?: number;
}

export interface UsuarioPayload {
  dni: string;
  nombres: string;
  apellidos: string;
  email: string;
  password?: string;
  rol_id: number;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly api = inject(ApiService);

  listar(filtros: FiltrosUsuario = {}): Observable<Usuario[]> {
    const params: Record<string, string | number> = {};
    if (filtros.nombre) {
      params['nombre'] = filtros.nombre;
    }
    if (filtros.email) {
      params['email'] = filtros.email;
    }
    if (filtros.activo !== undefined && filtros.activo !== null) {
      params['activo'] = filtros.activo;
    }
    return this.api.get<Usuario[]>('/usuarios', params);
  }

  crear(payload: UsuarioPayload): Observable<Usuario> {
    return this.api.post<Usuario>('/usuarios', payload);
  }

  actualizar(id: number, payload: Partial<UsuarioPayload>): Observable<Usuario> {
    return this.api.put<Usuario>(`/usuarios/${id}`, payload);
  }

  eliminar(id: number): Observable<void> {
    return this.api.delete<void>(`/usuarios/${id}`);
  }

  validarDni(dni: string): Observable<{ disponible: boolean }> {
    return this.api.get<{ disponible: boolean }>('/usuarios/validar-dni', { dni });
  }
}
