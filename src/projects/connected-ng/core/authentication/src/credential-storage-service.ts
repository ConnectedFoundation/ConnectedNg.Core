import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, timer } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';

const EXPIRY_WARNING_MS = 60_000;

@Injectable({
  providedIn: 'root',
})
export class CredentialStorageService implements OnDestroy {
  private readonly tokenKey = 'access_token';
  private readonly tokenValidityKey = 'access_token_validity';

  private _timerSubscription: Subscription | null = null;
  private readonly _tokenAboutToExpire$ = new Subject<void>();

  _hasToken$ = new BehaviorSubject<boolean>(this.hasToken());

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this._hasToken$.next(true);
  }

  setTokenValidity(validity: Date) {
    localStorage.setItem(this.tokenValidityKey, validity.toISOString());
    this.scheduleExpiryWarning(validity);
  }

  getTokenValidity() {
    return new Date(localStorage.getItem(this.tokenValidityKey) ?? new Date());
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    this._hasToken$.next(false);
    this.cancelExpiryTimer();
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  hasToken$: Observable<boolean> = this._hasToken$.asObservable();
  tokenAboutToExpire$: Observable<void> = this._tokenAboutToExpire$.asObservable();

  ngOnDestroy(): void {
    this.cancelExpiryTimer();
  }

  private scheduleExpiryWarning(validity: Date): void {
    this.cancelExpiryTimer();
    const msUntilWarning = validity.getTime() - Date.now() - EXPIRY_WARNING_MS;
    if (msUntilWarning > 0) {
      this._timerSubscription = timer(msUntilWarning).subscribe(() => {
        if (this.hasToken()) {
          this._tokenAboutToExpire$.next();
        }
      });
    }
  }

  private cancelExpiryTimer(): void {
    this._timerSubscription?.unsubscribe();
    this._timerSubscription = null;
  }
}
