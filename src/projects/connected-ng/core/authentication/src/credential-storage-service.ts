import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, timer } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';

const EXPIRY_WARNING_MS = 60_000;

// setTimeout/RxJS timer overflows above ~24.8 days (32-bit ms) and fires immediately instead
const MAX_TIMER_MS = 2_147_483_647;

@Injectable({
  providedIn: 'root',
})
export class CredentialStorageService implements OnDestroy {
  private readonly tokenKey = 'access_token';
  private readonly tokenValidityKey = 'access_token_validity';

  private _warningSubscription: Subscription | null = null;
  private _expirySubscription: Subscription | null = null;
  private readonly _tokenAboutToExpire$ = new Subject<void>();
  private readonly _tokenExpired$ = new Subject<void>();

  _hasToken$ = new BehaviorSubject<boolean>(this.hasToken());

  constructor() {
    // Another tab signing in, out, or renewing must be reflected here too, or this tab keeps
    // using a stale token or fires its timers at the wrong moment.
    window.addEventListener('storage', (event) => {
      if (event.key === this.tokenKey)
        this._hasToken$.next(!!event.newValue);
      else if (event.key === this.tokenValidityKey)
        this.armTimers();
    });

    this.armTimers();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this._hasToken$.next(true);
  }

  setTokenValidity(validity: Date) {
    localStorage.setItem(this.tokenValidityKey, validity.toISOString());
    this.armTimers();
  }

  getTokenValidity() {
    return new Date(localStorage.getItem(this.tokenValidityKey) ?? new Date());
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    this._hasToken$.next(false);
    this.cancelExpiryTimers();
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  hasToken$: Observable<boolean> = this._hasToken$.asObservable();
  tokenAboutToExpire$: Observable<void> = this._tokenAboutToExpire$.asObservable();
  tokenExpired$: Observable<void> = this._tokenExpired$.asObservable();

  ngOnDestroy(): void {
    this.cancelExpiryTimers();
  }

  // Reads the stored validity and re-arms both timers from it - on construction (a reload must
  // not lose them) and whenever the validity changes, in this tab or another.
  private armTimers(): void {
    this.cancelExpiryTimers();

    if (!this.hasToken())
      return;

    const stored = localStorage.getItem(this.tokenValidityKey);

    if (!stored)
      return;

    const msLeft = new Date(stored).getTime() - Date.now();
    const msUntilWarning = Math.min(Math.max(msLeft - EXPIRY_WARNING_MS, 0), MAX_TIMER_MS);
    const msUntilExpiry = Math.min(Math.max(msLeft, 0), MAX_TIMER_MS);

    this._warningSubscription = timer(msUntilWarning).subscribe(() => {
      if (this.hasToken())
        this._tokenAboutToExpire$.next();
    });

    this._expirySubscription = timer(msUntilExpiry).subscribe(() => {
      if (this.hasToken())
        this._tokenExpired$.next();
    });
  }

  private cancelExpiryTimers(): void {
    this._warningSubscription?.unsubscribe();
    this._warningSubscription = null;
    this._expirySubscription?.unsubscribe();
    this._expirySubscription = null;
  }
}
