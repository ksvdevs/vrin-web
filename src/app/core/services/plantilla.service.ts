import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  EstadoPlantilla,
  Plantilla,
  PlantillaSeleccion,
  SeleccionPlantillaPayload,
  SubidaPlantillaResponse,
  TipoDocumentoPlantilla,
} from '../models/plantilla.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PlantillaService {
  private readonly api = inject(ApiService);

  listar(): Observable<Plantilla[]> {
    return this.api.get<Plantilla[]>('/plantillas');
  }

  listarTipos(): Observable<TipoDocumentoPlantilla[]> {
    return this.api.get<TipoDocumentoPlantilla[]>('/tipos-documento-plantilla');
  }

  subir(nombre: string, tipoDocumentoId: number, archivo: File): Observable<SubidaPlantillaResponse> {
    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('tipo_documento_id', String(tipoDocumentoId));
    formData.append('archivo', archivo);
    return this.api.post<SubidaPlantillaResponse>('/plantillas', formData);
  }

  cambiarEstado(id: number, estado: EstadoPlantilla): Observable<Plantilla> {
    return this.api.patch<Plantilla>(`/plantillas/${id}`, { estado });
  }

  eliminar(id: number): Observable<unknown> {
    return this.api.delete(`/plantillas/${id}`);
  }

  listarSeleccion(modulo: string): Observable<PlantillaSeleccion[]> {
    return this.api.get<PlantillaSeleccion[]>('/plantilla-seleccion', { modulo });
  }

  seleccionar(payload: SeleccionPlantillaPayload): Observable<PlantillaSeleccion> {
    return this.api.post<PlantillaSeleccion>('/plantilla-seleccion', payload);
  }
}
