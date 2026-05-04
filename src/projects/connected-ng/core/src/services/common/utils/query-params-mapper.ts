import { HttpParams } from "@angular/common/http";

export function queryParamsMapper<T extends object>(
  dto?: T
): HttpParams {
  let params = new HttpParams();

  if (!dto)
    return params;

  let result = resolveDto(dto);

  result.forEach(param => {
    params = params.append(param.name, stringify(param.value));
  });

  return params;
}

interface Param {
  name: string,
  value: string
}

function resolveDto(value: any): Param[] {
  if (!value || value === undefined)
    return [];

  let params: Param[] = [];

  if (typeof value !== 'object' || value instanceof Date) {
    // Leave for @MihaelOcvirk to resolve
  }

  if (Array.isArray(value)) {
    let retVal = resolveArray('', value);

    params = [...params, ...retVal];
  }

  if (isObject(value)) {
    let retVal = resolveObject('', value);

    params = [...params, ...retVal];
  }

  return params;
}

function resolveArray(basePath: string, value: any): Param[] {
  let retVal: Param[] = [];

  value.forEach((item: unknown, index: any) => {
    let path = `${basePath}[${index}]`;

    if (isObject(path)) {
      resolveObject(path, item);
    }

    if (isPrimitive(item)) {
      retVal.push({ name: path, value: stringify(item) });
    }
  });

  return retVal;
}

function resolveObject(basePath: string, value: any): Param[] {
  let retVal: Param[] = [];

  Object.keys(value).forEach((propertyName) => {
    let propertyValue = value[propertyName];

    if (propertyValue === null || propertyValue === undefined)
      return;

    if (isPrimitive(propertyValue)) {
      let val: Param = { name: `${basePath}${propertyName}`, value: propertyValue };

      retVal.push(val);
    }
    else if (Array.isArray(propertyValue)) {
      propertyValue.forEach(value => {
        retVal.push({ name: `${basePath}${propertyName}`, value: value });
      });
    }
    else if (isObject(value)) {
      let val = resolveObject(`${propertyName}.`, propertyValue);

      retVal.push(...val);
    }
  });

  return retVal;
}

function isPrimitive(value: unknown): boolean {
  return typeof value !== 'object' || value instanceof Date;
}

function isObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isEnum(value: unknown): boolean {
  return typeof value === 'number' || typeof value === 'string';
}

function stringify(value: any): string {
  if (value instanceof Date)
    return dateSerializer(value);

  if (typeof value === 'bigint')
    return value.toString();

  if (isEnum(value))
    return enumSerializer(value);

  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);

  return String(value);
}

function dateSerializer(value: Date): string {
  return value.toISOString();
}

function enumSerializer(value: unknown): string {
  return String(value);
}
