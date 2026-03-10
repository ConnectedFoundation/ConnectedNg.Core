export interface DtoDescriptor {
  properties: DtoPropertyDescriptor[];
}

export interface DtoPropertyDescriptor {
  name?: string;
  type?: string;  // "string" | "number" | "date" | "bool" | "object"
  description?: string;
  text?: string;
  isPassword: boolean;
  required: DtoRequiredDescriptor;
  minLength: DtoMaxLengthDescriptor;
  maxLength: DtoMaxLengthDescriptor;
  minValue: DtoMinValueDescriptor;
  maxValue: DtoMaxValueDescriptor;
  email: DtoEmailDescriptor;
}

export interface DtoRequiredDescriptor {
  isRequired: boolean;
  errorMessage?: string;
}

export interface DtoMaxLengthDescriptor {
  value?: number;
  errorMessage?: string;
}

export interface DtoMinValueDescriptor {
  value?: number;
  errorMessage?: string;
}

export interface DtoMaxValueDescriptor {
  value?: number;
  errorMessage?: string;
}

export interface DtoEmailDescriptor {
  isEnabled: boolean;
  errorMessage?: string;
}
