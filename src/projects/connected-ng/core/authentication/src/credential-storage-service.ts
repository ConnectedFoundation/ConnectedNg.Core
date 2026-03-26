import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';

@Injectable({
  providedIn: 'root',
})
export class CredentialStorageService {
  private readonly tokenKey = 'access_token';
  _hasToken$ = new BehaviorSubject<boolean>(this.hasToken());

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this._hasToken$.next(true);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    this._hasToken$.next(false);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  hasToken$ : Observable<boolean>  = this._hasToken$.asObservable();
}
