import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import type { Plantilla, SeleccionPlantilla, TipoDocumento } from '../models/plantilla.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PlantillaService {
  private readonly api = inject(ApiService);

  listar(tipoDocumentoId?: number): Observable<Plantilla[]> {
    return this.api.get<Plantilla[]>('/plantillas', tipoDocumentoId ? { tipo_documento_id: tipoDocumentoId } : undefined);
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
