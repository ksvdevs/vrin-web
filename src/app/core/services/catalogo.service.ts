import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Facultad, FacultadPayload } from '../models/facultad.model';
import { Escuela, EscuelaPayload } from '../models/escuela.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly api = inject(ApiService);

  listarFacultades(): Observable<Facultad[]> {
    return this.api.get<Facultad[]>('/facultades');
  }

  crearFacultad(payload: FacultadPayload): Observable<Facultad> {
    return this.api.post<Facultad>('/facultades', payload);
  }

  crearEscuela(payload: EscuelaPayload): Observable<Escuela> {
    return this.api.post<Escuela>('/escuelas', payload);
  }
}
