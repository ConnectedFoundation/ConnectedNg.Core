export const CLAIM_UNDEFINED = '*';

export enum ClaimStatus {
  Pending = 1,
  Approved = 2,
  Denied = 3
}

export interface Claim {
  id: number;
  value: string;
  schema?: string;
  identity?: string;
  entity: string;
  entityId: string;
  status: ClaimStatus;
}

export interface ClaimSchema {
  text: string;
  entity: string;
  entityId: string;
}

export interface ClaimDescriptor {
  entity: string;
  entityId: string;
  value: string;
  text?: string;
}

export interface InsertClaimDto {
  value: string;
  schema?: string;
  identity?: string;
  entity: string;
  entityId: string;
}

export interface QueryClaimDto {
  schema?: string;
  identity?: string;
  entity: string;
  entityId: string;
}

export interface QueryClaimSchemaDto {
  entity: string;
  entityId: string;
}

export interface QueryClaimDescriptorsDto {
  entity: string;
  entityId: string;
}

