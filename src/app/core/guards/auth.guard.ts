import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado) return true;

  return auth.verificarSesion().pipe(
    map(isAuthenticated => {
      if (isAuthenticated) return true;
      return router.createUrlTree(['/login']);
    })
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado) return router.createUrlTree(['/']);

  return auth.verificarSesion().pipe(
    map(isAuthenticated => {
      if (!isAuthenticated) return true;
      return router.createUrlTree(['/']);
    })
  );
};
