export interface IdentityAuthenticationToken {
    id: number;
    key: string;
    token: string | null;
    identity: string;
    status: number;
    expire: string | null;
}
