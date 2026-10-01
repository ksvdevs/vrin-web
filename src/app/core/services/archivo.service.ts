import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ArchivoService {
  private readonly api = inject(ApiService);

  obtenerBlob(expedienteId: number, archivoId: number, descargar = false): Observable<Blob> {
    return this.api.getBlob(`/expedientes/${expedienteId}/archivos/${archivoId}`, descargar
      ? { descargar: 1 }
      : undefined);
  }
}
