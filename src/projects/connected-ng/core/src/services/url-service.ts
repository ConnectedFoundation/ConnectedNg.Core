import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UrlService {
  constructor() { }

  public generateUrl(...segments: string[]): string {
    return segments
      .map(segment => segment.replace(/\/$/, ''))
      .join('/');
  }
}
