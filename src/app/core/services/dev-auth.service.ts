import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';

import { Usuario } from '../models/usuario.model';
import { ApiService } from './api.service';

const STORAGE_KEY = 'sgr-dev-usuario-id';

@Injectable({ providedIn: 'root' })
export class DevAuthService {
  private readonly api = inject(ApiService);

  readonly usuarioActual = signal<Usuario | null>(null);

  get usuarioId(): number | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    const id = raw === null ? NaN : Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  entrarComo(id: number): void {
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  salir(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.usuarioActual.set(null);
  }

  cargarUsuarioActual() {
    return this.api.get<Usuario>('/me').pipe(
      tap({
        next: (usuario) => this.usuarioActual.set(usuario),
        error: () => this.salir(),
      }),
    );
  }

  listarUsuariosDev() {
    return this.api.get<Usuario[]>('/dev/usuarios');
  }
}
