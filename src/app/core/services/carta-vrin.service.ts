import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CartaVrinService {
  private readonly api = inject(ApiService);

  preview(expedienteId: number, payload: unknown): Observable<Blob> {
    return this.api.postBlob(`/expedientes/${expedienteId}/carta-vrin/preview`, payload);
  }

  actualizar(expedienteId: number, payload: Record<string, string | number | null>): Observable<unknown> {
    return this.api.put(`/expedientes/${expedienteId}/carta-vrin`, payload);
  }

  sugerencia(anio: number): Observable<{ anio: number; siguiente_numero: number }> {
    return this.api.get('/cartas-vrin/sugerencia', { anio });
  }
}
