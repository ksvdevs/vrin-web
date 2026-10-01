import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ExpedientePayload,
  ExpedienteFila,
  Paginado,
  RespuestaRegistroExpediente,
} from '../models/expediente.model';
import { ExpedienteDetalle } from '../models/expediente-detalle.model';
import {
  RespuestaDocumentosCompletos,
  RespuestaValidacion,
  ValidacionPayload,
} from '../models/validacion.model';
import { ApiService } from './api.service';

export interface ArchivoExpediente {
  id: number;
  tipo: string;
  etapa: number;
  nombre_original: string;
  storage_path?: string;
  mime?: string | null;
  tamano_bytes?: number;
  sha256?: string;
}

export interface FiltrosExpediente {
  estado?: string;
  desde?: string;
  hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpedienteService {
  private readonly api = inject(ApiService);

  registrar(payload: ExpedientePayload): Observable<RespuestaRegistroExpediente> {
    return this.api.post<RespuestaRegistroExpediente>('/expedientes', payload);
  }

  listar(filtros: FiltrosExpediente, pagina: number): Observable<Paginado<ExpedienteFila>> {
    const params: Record<string, string | number> = { page: pagina };
    if (filtros.estado) {
      params['estado'] = filtros.estado;
    }
    if (filtros.desde) {
      params['desde'] = filtros.desde;
    }
    if (filtros.hasta) {
      params['hasta'] = filtros.hasta;
    }
    return this.api.get<Paginado<ExpedienteFila>>('/expedientes', params);
  }

  obtener(id: number): Observable<ExpedienteDetalle> {
    return this.api.get<ExpedienteDetalle>(`/expedientes/${id}`);
  }

  subirCarta(expedienteId: number, archivo: File): Observable<ArchivoExpediente> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.api.post<ArchivoExpediente>(`/expedientes/${expedienteId}/archivos`, datos);
  }

  // Fase 4 — validación de Calidad (RN-01) y subsanación (RN-12).
  validar(expedienteId: number, payload: ValidacionPayload): Observable<RespuestaValidacion> {
    return this.api.post<RespuestaValidacion>(`/expedientes/${expedienteId}/validacion`, payload);
  }

  marcarDocumentosCompletos(expedienteId: number): Observable<RespuestaDocumentosCompletos> {
    return this.api.patch<RespuestaDocumentosCompletos>(
      `/expedientes/${expedienteId}/documentos-completos`,
      {},
    );
  }
}
