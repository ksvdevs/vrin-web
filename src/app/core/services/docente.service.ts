import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Docente, DocentePayload } from '../models/docente.model';
import { RespuestaPaginada } from '../models/paginacion.model';
import { ApiService } from './api.service';

export interface FiltrosDocente {
  busqueda?: string;
  activo?: number;
  categoria?: string;
  grado?: string;
}

@Injectable({ providedIn: 'root' })
export class DocenteService {
  private readonly api = inject(ApiService);

  listar(filtros: FiltrosDocente = {}, pagina = 1): Observable<RespuestaPaginada<Docente>> {
    const params: Record<string, string | number> = { page: pagina };
    if (filtros.busqueda) {
      params['busqueda'] = filtros.busqueda;
    }
    if (filtros.activo !== undefined && filtros.activo !== null) {
      params['activo'] = filtros.activo;
    }
    if (filtros.categoria) {
      params['categoria'] = filtros.categoria;
    }
    if (filtros.grado) {
      params['grado'] = filtros.grado;
    }
    return this.api.get<RespuestaPaginada<Docente>>('/docentes', params);
  }

  // Autocompletado (registro de expediente): array plano de activos vía ?q=.
  buscarPorNombre(q: string): Observable<Docente[]> {
    return this.api.get<Docente[]>('/docentes', { q: q.trim(), solo_nombre: 1 });
  }

  crear(payload: DocentePayload): Observable<Docente> {
    return this.api.post<Docente>('/docentes', payload);
  }

  actualizar(id: number, payload: DocentePayload): Observable<Docente> {
    return this.api.put<Docente>(`/docentes/${id}`, payload);
  }

  cambiarEstado(id: number, payload: DocentePayload): Observable<Docente> {
    return this.api.put<Docente>(`/docentes/${id}`, payload);
  }

  eliminar(id: number): Observable<unknown> {
    return this.api.delete(`/docentes/${id}`);
  }
}
