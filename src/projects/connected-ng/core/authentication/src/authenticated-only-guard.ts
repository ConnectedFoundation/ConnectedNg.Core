import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AUTHENTICATION_SERVICE } from './authentication-service-contract';

export const authenticatedOnlyGuard: CanActivateFn = (route, state) => {
  const auth = inject(AUTHENTICATION_SERVICE);
  const router = inject(Router);

  return auth.isLoggedIn$.pipe(
    take(1),
    map(isLoggedIn => {
      if (isLoggedIn)
        return true;

      return router.createUrlTree(['/auth'], {
        queryParams: { returnUrl: state.url }
      });
    })
  );
};
