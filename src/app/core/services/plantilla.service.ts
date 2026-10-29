import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import type { RespuestaPaginada } from '../models/paginacion.model';
import type { Plantilla, SeleccionPlantilla, TipoDocumento } from '../models/plantilla.model';
import { ApiService } from './api.service';

export interface FiltrosPlantilla {
  busqueda?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
  desde?: string;
  hasta?: string;
  tipo_documento_id?: number;
}

@Injectable({ providedIn: 'root' })
export class PlantillaService {
  private readonly api = inject(ApiService);

  listarTipos(): Observable<TipoDocumento[]> {
    return this.api.get<TipoDocumento[]>('/plantillas/tipos');
  }

  listar(
    filtros: FiltrosPlantilla = {},
    pagina = 1,
    porPagina = 15,
  ): Observable<RespuestaPaginada<Plantilla>> {
    const params: Record<string, string | number> = { page: pagina, per_page: porPagina };
    if (filtros.busqueda) {
      params['busqueda'] = filtros.busqueda;
    }
    if (filtros.estado) {
      params['estado'] = filtros.estado;
    }
    if (filtros.desde) {
      params['desde'] = filtros.desde;
    }
    if (filtros.hasta) {
      params['hasta'] = filtros.hasta;
    }
    if (filtros.tipo_documento_id) {
      params['tipo_documento_id'] = filtros.tipo_documento_id;
    }
    return this.api.get<RespuestaPaginada<Plantilla>>('/plantillas', params);
  }

  subir(datos: {
    nombre: string;
    tipo_documento_id: number;
    archivo: File;
  }): Observable<Plantilla> {
    const formulario = new FormData();
    formulario.append('nombre', datos.nombre);
    formulario.append('tipo_documento_id', String(datos.tipo_documento_id));
    formulario.append('archivo', datos.archivo);
    return this.api.post<Plantilla>('/plantillas', formulario);
  }

  cambiarEstado(id: number, estado: 'ACTIVO' | 'INACTIVO'): Observable<{ id: number; estado: string }> {
    return this.api.patch(`/plantillas/${id}`, { estado });
  }

  actualizarNombre(id: number, nombre: string): Observable<{ id: number; nombre: string; estado: string }> {
    return this.api.patch(`/plantillas/${id}`, { nombre });
  }

  eliminar(id: number): Observable<void> {
    return this.api.delete<void>(`/plantillas/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class SeleccionService {
  private readonly api = inject(ApiService);
  readonly catalogo = signal<{
    usuarioId: number;
    cartas: Plantilla[];
    resoluciones: Plantilla[];
    cartaId: number | null;
    resolucionId: number | null;
  } | null>(null);

  listarVigentes(modulo = 'ARTICULOS'): Observable<SeleccionPlantilla[]> {
    return this.api.get<SeleccionPlantilla[]>('/plantilla-seleccion', { modulo });
  }

  seleccionar(datos: {
    modulo: string;
    tipo_documento_id: number;
    plantilla_id: number;
  }): Observable<{ modulo: string; tipo_documento_id: number; plantilla_id: number }> {
    return this.api.post('/plantilla-seleccion', datos);
  }
}
