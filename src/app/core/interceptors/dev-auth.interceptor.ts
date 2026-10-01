import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { DevAuthService } from '../services/dev-auth.service';

export const devAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const usuarioId = inject(DevAuthService).usuarioId;

  if (usuarioId !== null && req.url.startsWith(environment.apiUrl)) {
    req = req.clone({
      setHeaders: { 'X-Dev-User-Id': String(usuarioId) },
    });
  }

  return next(req);
};
