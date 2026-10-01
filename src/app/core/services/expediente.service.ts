import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  EstadoExpediente,
  ExpedientePayload,
  ExpedienteFila,
  Paginado,
  RespuestaRegistroExpediente,
} from '../models/expediente.model';
import { ExpedienteDetalle, ValidacionPayload } from '../models/expediente-detalle.model';
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

  actualizar(id: number, payload: ExpedientePayload): Observable<ExpedienteDetalle> {
    return this.api.put<ExpedienteDetalle>(`/expedientes/${id}`, payload);
  }

  eliminar(id: number): Observable<void> {
    return this.api.delete<void>(`/expedientes/${id}`);
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

  validar(id: number, payload: ValidacionPayload): Observable<{ estado: EstadoExpediente; validacion: unknown }> {
    return this.api.post(`/expedientes/${id}/validacion`, payload);
  }

  marcarDocumentosCompletos(
    id: number,
  ): Observable<{ id: number; estado: EstadoExpediente; documentos_completos: boolean }> {
    return this.api.patch(`/expedientes/${id}/documentos-completos`, {});
  }

  generarCarta(
    id: number,
    payload: {
      numero: number;
      anio: number;
      fecha: string;
      ciudad?: string | null;
      registro_mp_numero?: string | null;
    },
  ): Observable<{
    estado: EstadoExpediente;
    etapa_actual: number;
    carta_vrin: unknown;
    documento_generado: { id: number; version: number; docx_path: string; pdf_path: string | null } | null;
  }> {
    return this.api.post(`/expedientes/${id}/carta-vrin`, payload);
  }

    registrarRespuestaOpp(
      id: number,
      payload: Record<string, string | number | null>,
    ): Observable<{
      estado: EstadoExpediente;
      etapa_actual: number;
      cerrado_at: string | null;
      respuesta_opp: unknown;
    }> {
      return this.api.post(`/expedientes/${id}/respuesta-opp`, payload);
    }
  
    generarResolucion(
      id: number,
      payload: {
        numero: number;
        anio: number;
        fecha_emision: string;
      },
    ): Observable<{
      estado: EstadoExpediente;
      etapa_actual: number;
      resolucion: unknown;
      documento_generado: { id: number; version: number; docx_path: string; pdf_path: string | null } | null;
    }> {
      return this.api.post(`/expedientes/${id}/resolucion/generar`, payload);
    }
  
    anularDocumento(expedienteId: number, documentoId: number): Observable<{ mensaje: string }> {
      return this.api.post(`/expedientes/${expedienteId}/documentos/${documentoId}/anular`, {});
    }

  subirArchivo(id: number, archivo: File, tipo: string, etapa?: number): Observable<ArchivoExpediente> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    datos.append('tipo', tipo);
    if (etapa !== undefined) {
      datos.append('etapa', String(etapa));
    }
    return this.api.post<ArchivoExpediente>(`/expedientes/${id}/archivos`, datos);
  }

  subirCarta(expedienteId: number, archivo: File): Observable<ArchivoExpediente> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.api.post<ArchivoExpediente>(`/expedientes/${expedienteId}/archivos`, datos);
  }

  registrarDesembolso(id: number, payload: { fecha_desembolso: string }): Observable<unknown> {
    return this.api.post(`/expedientes/${id}/rendicion/desembolso`, payload);
  }

  actualizarFechaLimite(id: number, payload: { fecha_limite: string }): Observable<unknown> {
    return this.api.patch(`/expedientes/${id}/rendicion/fecha-limite`, payload);
  }

  actualizarDoi(id: number, payload: { doi: string }): Observable<unknown> {
    return this.api.post(`/expedientes/${id}/rendicion/doi`, payload);
  }

  cerrarRendicion(id: number, payload: { fecha_informe: string }): Observable<unknown> {
    return this.api.post(`/expedientes/${id}/rendicion/cerrar`, payload);
  }
}
