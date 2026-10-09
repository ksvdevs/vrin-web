import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Docente, DocentePayload } from '../models/docente.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DocenteService {
  private readonly api = inject(ApiService);

  listar(q?: string): Observable<Docente[]> {
    const termino = q?.trim();
    return termino
      ? this.api.get<Docente[]>('/docentes', { q: termino })
      : this.api.get<Docente[]>('/docentes');
  }

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
