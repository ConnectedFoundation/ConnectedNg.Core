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

    let result = await lastValueFrom<any>(request);

    try {
      let devConfig = await lastValueFrom(this.http.get<any>('/config/config.dev.json'));

      Object.assign(result, devConfig);
    } catch { }

    return result;
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
