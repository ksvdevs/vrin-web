import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sanctumUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  readonly usuarioActual = signal<Usuario | null>(null);

  get estaAutenticado(): boolean {
    return this.usuarioActual() !== null;
  }

  login(email: string, password: string): Observable<Usuario> {
    return this.http
      .get(`${this.sanctumUrl}/sanctum/csrf-cookie`, { withCredentials: true })
      .pipe(
        switchMap(() => this.api.post<Usuario>('/login', { email, password })),
        tap((usuario) => {
          this.usuarioActual.set(usuario);
          this.router.navigate(['/']);
        }),
      );
  }

  salir(): void {
    this.api.post('/logout', {}).subscribe({
      next: () => this.cerrarSesionLocal(),
      error: () => this.cerrarSesionLocal(),
    });
  }

  cerrarSesionLocal(): void {
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
