import { PrimaryKeyDto } from "./primary-key-dto";

export interface PatchDto<T> extends PrimaryKeyDto<T> {
  properties: Record<string, unknown | null>;
}
