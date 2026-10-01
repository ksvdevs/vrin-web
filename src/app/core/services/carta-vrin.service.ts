import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CartaVrinService {
  private readonly api = inject(ApiService);

  sugerencia(anio: number): Observable<{ anio: number; siguiente_numero: number }> {
    return this.api.get('/cartas-vrin/sugerencia', { anio });
  }
}
