import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Docente, DocentePayload } from '../models/docente.model';
import { RespuestaPaginada } from '../models/paginacion.model';
import { ApiService } from './api.service';

export interface FiltrosDocente {
  busqueda?: string;
  activo?: number;
  categoria?: string;
  genero?: string;
  escuela_id?: number;
}

export interface ConsultaDniDocente {
  registrado: boolean;
  message?: string;
  datos?: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  };
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
    if (filtros.genero) {
      params['genero'] = filtros.genero;
    }
    if (filtros.escuela_id) {
      params['escuela_id'] = filtros.escuela_id;
    }
    return this.api.get<RespuestaPaginada<Docente>>('/docentes', params);
  }

  // Autocompletado (registro de expediente): array plano de activos vía ?q=.
  buscarPorNombre(q: string): Observable<Docente[]> {
    return this.api.get<Docente[]>('/docentes', { q: q.trim(), solo_nombre: 1 });
  }

  consultarDni(dni: string): Observable<ConsultaDniDocente> {
    return this.api.get<ConsultaDniDocente>('/docentes/consultar-dni', { dni });
  }

  crear(payload: DocentePayload): Observable<Docente> {
    return this.api.post<Docente>('/docentes', payload);
  }

  actualizar(id: number, payload: DocentePayload): Observable<Docente> {
    return this.api.put<Docente>(`/docentes/${id}`, payload);
  }

  cambiarEstado(id: number, activo: boolean): Observable<Docente> {
    return this.api.patch<Docente>(`/docentes/${id}/estado`, { activo });
  }

  eliminar(id: number): Observable<unknown> {
    return this.api.delete(`/docentes/${id}`);
  }
}
