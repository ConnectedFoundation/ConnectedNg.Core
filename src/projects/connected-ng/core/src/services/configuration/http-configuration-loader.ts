import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { lastValueFrom, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HttpConfigurationLoader {
  constructor() { }

  private config?: any;

  http = inject(HttpClient);

  async loadConfig(): Promise<any> {
    let request = this.http
      .get<any>('/config/config.json')
      .pipe(tap((data) => this.config = data));

    return await lastValueFrom<any>(request);
  }

  getConfig(): any {
    return this.config ?? { apiUrl: '', apiAccessToken: '' };
  }

  public getBaseServerUrl() {
    return this.getConfig().apiUrl;
  }

  public getApiAccessToken() {
    return this.getConfig().apiAccessToken;
  }
}
