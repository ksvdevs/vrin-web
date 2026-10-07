import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ResolucionService {
  private readonly api = inject(ApiService);

  sugerencia(anio: number): Observable<{ anio: number; siguiente_numero: number }> {
    return this.api.get('/resoluciones/sugerencia', { anio });
  }

  preview(expedienteId: number, payload: { numero: number; anio: number; fecha_emision: string }): Observable<Blob> {
    return this.api.postBlob(`/expedientes/${expedienteId}/resolucion/preview`, payload);
  }
}
