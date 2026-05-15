export interface Membership {
  id: number;
  identity: string;
  role: number;
}

export interface InsertMembershipDto {
  identity: string;
  role: number;
}

export interface QueryMembershipDto {
  identity?: string;
  role?: number;
}
