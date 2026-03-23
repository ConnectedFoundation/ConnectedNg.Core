import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AUTHENTICATION_SERVICE } from './authentication-service-contract';


export const anonimousRedirectGuard: CanActivateFn = (route, state) => {
  const auth = inject(AUTHENTICATION_SERVICE);
  const router = inject(Router);

  return auth.isLoggedIn$.pipe(
    take(1),
    map(isLoggedIn => {
      if (!isLoggedIn)
        return true;

      // If someone hit /auth while logged in, send them back where they wanted to go
      const returnUrl = route.queryParamMap.get('returnUrl');
      return router.createUrlTree([returnUrl ?? '/']);
    })
  );
};
