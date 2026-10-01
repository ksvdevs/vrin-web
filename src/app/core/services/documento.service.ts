import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private readonly api = inject(ApiService);

  obtenerBlob(expedienteId: number, documentoId: number, formato: 'pdf' | 'docx', descargar = false): Observable<Blob> {
    const params: Record<string, string | number> = { formato };
    if (descargar) {
      params['descargar'] = 1;
    }
    return this.api.getBlob(`/expedientes/${expedienteId}/documentos/${documentoId}`, params);
  }
}
