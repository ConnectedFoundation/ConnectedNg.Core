import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CredentialStorageService } from './credential-storage-service';

export const bearerAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(CredentialStorageService);

  const token = tokenStorage.getToken();

  // If we already have a token, send the request with the Authorization header.
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `bearer ${token}`
      }
    });

    return next(cloned);
  }

  return next(req);
};
