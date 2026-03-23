import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface AuthenticationServiceContract {
  readonly isLoggedIn$: Observable<boolean>;
  readonly roles$: Observable<string[]>;
}

export const AUTHENTICATION_SERVICE = new InjectionToken<AuthenticationServiceContract>('AUTHENTICATION_SERVICE');
