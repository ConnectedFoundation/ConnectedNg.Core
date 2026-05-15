import { Status } from '@connected-ng/core';

export { Status as RoleStatus };

export interface Role {
  id: number;
  name: string;
  status: Status;
  parent?: number;
  token: string;
}

export interface InsertRoleDto {
  name: string;
  parent?: number;
}

export interface UpdateRoleDto {
  id: number;
  name: string;
  status: Status;
  parent?: number;
}
