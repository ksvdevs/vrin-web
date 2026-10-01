import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Always attach credentials (cookies) for Sanctum SPA Auth
  const clonedRequest = req.clone({
    withCredentials: true,
  });

  return next(clonedRequest);
};
