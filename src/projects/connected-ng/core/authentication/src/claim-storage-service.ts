import { Injectable } from '@angular/core';

const CLAIM_STATUS_APPROVED = 2;

export interface StoredClaim {
  value: string;
  schema?: string;
  entity?: string;
  entityId?: string;
  status: number;
}

@Injectable({ providedIn: 'root' })
export class ClaimStorageService {
  private readonly claimsKey = 'identity_claims';

  setClaims(claims: StoredClaim[]): void {
    const approved = claims.filter(c => c.status === CLAIM_STATUS_APPROVED);
    localStorage.setItem(this.claimsKey, JSON.stringify(approved));
  }

  clearClaims(): void {
    localStorage.removeItem(this.claimsKey);
  }

  hasClaim(value: string, schema?: string, entity?: string, entityId?: string): boolean {
    return this.getClaims().some(c =>
      c.value === value &&
      (schema === undefined || c.schema === schema) &&
      (entity === undefined || c.entity === entity) &&
      (entityId === undefined || c.entityId === entityId)
    );
  }

  private getClaims(): StoredClaim[] {
    const raw = localStorage.getItem(this.claimsKey);
    if (!raw) return [];
    try { return JSON.parse(raw) as StoredClaim[]; }
    catch { return []; }
  }
}