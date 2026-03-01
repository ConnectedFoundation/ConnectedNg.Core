import { OrderByMode } from "../enums/order-by-mode";

export interface QueryDto {
  orderBy: OrderByDescriptor[];
  paging: PagingOptions;
}

export interface OrderByDescriptor {
  property: string;
  mode: OrderByMode;
}

export interface PagingOptions {
  size: number;
  index: number;
}
