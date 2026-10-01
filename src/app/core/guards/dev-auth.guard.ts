import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { DevAuthService } from '../services/dev-auth.service';

export const devAuthGuard: CanActivateFn = () => {
  const auth = inject(DevAuthService);
  const router = inject(Router);

  return auth.usuarioId !== null ? true : router.createUrlTree(['/login']);
};

export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(DevAuthService);
  const router = inject(Router);

  return auth.usuarioId === null ? true : router.createUrlTree(['/']);
};
