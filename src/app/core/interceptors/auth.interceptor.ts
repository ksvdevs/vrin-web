import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Always attach credentials (cookies) for Sanctum SPA Auth.
  // Angular's built-in XSRF handling only covers same-origin requests, so the
  // X-XSRF-TOKEN header is attached manually for cross-origin API calls.
  const xsrfToken = getCookie('XSRF-TOKEN');
  const clonedRequest = req.clone({
    withCredentials: true,
    setHeaders: xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {},
  });

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // /me es una sonda de sesión: su 401 lo gestionan los guards; redirigir
      // aquí cancelaría la navegación inicial y dejaría la página en blanco.
      const esSonda = req.url.includes('/login')
        || req.url.includes('/sanctum/csrf-cookie')
        || req.url.endsWith('/me');
      if (error.status === 401 && !esSonda && !router.getCurrentNavigation()) {
        auth.usuarioActual.set(null);
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};

function getCookie(nombre: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
