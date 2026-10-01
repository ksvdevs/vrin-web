import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';

import { Usuario } from '../models/usuario.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  readonly usuarioActual = signal<Usuario | null>(null);

  get estaAutenticado(): boolean {
    return this.usuarioActual() !== null;
  }

  salir(): void {
    // Ideally call a logout endpoint, then clear state
    this.usuarioActual.set(null);
    window.location.href = '/login';
  }

  verificarSesion() {
    return this.api.get<Usuario>('/me').pipe(
      tap({
        next: (usuario) => this.usuarioActual.set(usuario),
        error: () => this.usuarioActual.set(null),
      }),
      map(user => !!user),
      catchError(() => of(false))
    );
  }
}
