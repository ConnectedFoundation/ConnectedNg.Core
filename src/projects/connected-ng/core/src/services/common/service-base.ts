import { HttpClient } from "@angular/common/http";
import { UrlService } from "../url-service";
import { HttpMethod } from "./enums/http-method";
import { Observable } from "rxjs";
import { DtoDescriptor } from "./dtos/dto-descriptor";
import { inject } from "@angular/core";
import { queryParamsMapper } from "./utils/query-params-mapper";

export interface ServiceDescriptor {
  baseUrl: string;
  serviceUrl: string;
}

export type InvokableServiceOperation<TDto extends object | undefined, TReturnType> =
  undefined extends TDto
  ? {
    (dto?: TDto): Observable<TReturnType>;
    describeDto(): Observable<DtoDescriptor>;
  }
  : {
    (dto: TDto): Observable<TReturnType>;
    describeDto(): Observable<DtoDescriptor>;
  };

// Overload: Using ServiceBase (shorter)
export function createServiceOperation<TDto extends object | undefined, TReturnType>(
  serviceBase: ConnectedService,
  operation: string,
  method?: HttpMethod
): InvokableServiceOperation<TDto, TReturnType>;

// Overload: Using ServiceDescriptor (explicit)
export function createServiceOperation<TDto extends object | undefined, TReturnType>(
  service: ServiceDescriptor,
  operation: string,
  method: HttpMethod,
  client: HttpClient,
  urlService: UrlService
): InvokableServiceOperation<TDto, TReturnType>;

// Implementation
export function createServiceOperation<TDto extends object | undefined, TReturnType>(
  serviceOrBase: ServiceDescriptor | ConnectedService,
  operation: string,
  method: HttpMethod = HttpMethod.GET,
  client?: HttpClient,
  urlService?: UrlService
): InvokableServiceOperation<TDto, TReturnType> {
  let service: ServiceDescriptor | (() => ServiceDescriptor);
  let httpClient: HttpClient;
  let urlSvc: UrlService;

  if ('getService' in serviceOrBase) {
    // It's a ServiceBase
    service = () => serviceOrBase.getService();
    httpClient = serviceOrBase.http;
    urlSvc = serviceOrBase.urlService;
  } else {
    // It's a ServiceDescriptor
    service = serviceOrBase;
    httpClient = client!;
    urlSvc = urlService!;
  }

  const serviceOp = new ServiceOperation<TDto, TReturnType>(service, operation, method, httpClient, urlSvc);

  const invokeFn = ((dto?: TDto): Observable<TReturnType> => {
    return serviceOp.invoke(dto as TDto);
  }) as any;

  invokeFn.describeDto = (): Observable<DtoDescriptor> => {
    return serviceOp.describe();
  };

  return invokeFn as InvokableServiceOperation<TDto, TReturnType>;
}

// Convenience functions for each HTTP method
export function createGetServiceOperation<TDto extends object | undefined, TReturnType>(
  serviceBase: ConnectedService,
  operation: string
): InvokableServiceOperation<TDto, TReturnType> {
  return createServiceOperation<TDto, TReturnType>(serviceBase, operation, HttpMethod.GET);
}

export function createPostServiceOperation<TDto extends object | undefined, TReturnType>(
  serviceBase: ConnectedService,
  operation: string
): InvokableServiceOperation<TDto, TReturnType> {
  return createServiceOperation<TDto, TReturnType>(serviceBase, operation, HttpMethod.POST);
}

export function createPutServiceOperation<TDto extends object | undefined, TReturnType>(
  serviceBase: ConnectedService,
  operation: string
): InvokableServiceOperation<TDto, TReturnType> {
  return createServiceOperation<TDto, TReturnType>(serviceBase, operation, HttpMethod.PUT);
}

export function createDeleteServiceOperation<TDto extends object | undefined, TReturnType>(
  serviceBase: ConnectedService,
  operation: string
): InvokableServiceOperation<TDto, TReturnType> {
  return createServiceOperation<TDto, TReturnType>(serviceBase, operation, HttpMethod.DELETE);
}

export interface ConnectedService {
  http: HttpClient;
  urlService: UrlService;

  getService(): ServiceDescriptor;
}

export abstract class ConnectedServiceBase implements ConnectedService {
  http = inject(HttpClient);
  urlService = inject(UrlService);

  abstract serviceUrl: string;

  abstract getBaseUrl(): string;

  createGetOperation<TDto extends object | undefined, TReturnType>(name: string) {
    return createGetServiceOperation<TDto, TReturnType>(this, name)
  };

  createPostOperation<TDto extends object | undefined, TReturnType>(name: string) {
    return createPostServiceOperation<TDto, TReturnType>(this, name)
  };

  createPutOperation<TDto extends object | undefined, TReturnType>(name: string) {
    return createPutServiceOperation<TDto, TReturnType>(this, name)
  };

  createDeleteOperation<TDto extends object | undefined, TReturnType>(name: string) {
    return createDeleteServiceOperation<TDto, TReturnType>(this, name)
  };

  getService(): ServiceDescriptor {
    return { baseUrl: this.getBaseUrl(), serviceUrl: this.serviceUrl };
  }
}

export class ServiceOperation<TDto extends object | undefined, TReturnType> {
  service: ServiceDescriptor | (() => ServiceDescriptor);
  operation: string;
  method: HttpMethod = HttpMethod.GET;
  client: HttpClient;
  urlService: UrlService;

  constructor(service: ServiceDescriptor | (() => ServiceDescriptor), operation: string, method: HttpMethod = HttpMethod.GET, client?: HttpClient, urlService?: UrlService) {
    this.service = service;
    this.operation = operation;
    this.method = method;
    this.client = client ?? inject(HttpClient)
    this.urlService = urlService ?? inject(UrlService);
  }

  invoke(dto: TDto): Observable<TReturnType> {
    let service = (typeof this.service == 'function') ? this.service() : this.service;

    let url = this.urlService.generateUrl(service.baseUrl, `${service.serviceUrl}/${this.operation}`);
    let payload = this.getBodyAndParams(dto);
    let fn = this.resolveMethodFunction();

    return fn(url, payload.body, { params: payload.params }) as Observable<TReturnType>;
  }

  getBodyAndParams(dto: TDto) {
    if (this.method == HttpMethod.GET || this.method == HttpMethod.DELETE)
      return {
        params: queryParamsMapper(dto),
        body: null
      };

    return {
      body: dto,
      params: undefined
    };
  }

  describe(): Observable<DtoDescriptor> {
    let service = (typeof this.service == 'function') ? this.service() : this.service;

    let url = this.urlService.generateUrl(service.baseUrl, `${service.serviceUrl}/${this.operation}/dto`);
    return this.client.get<DtoDescriptor>(url);
  }

  private resolveMethodFunction(): (url: string, body: any, options?: any) => Observable<any> {
    switch (this.method) {
      case HttpMethod.POST:
        return (url: string, body: any, options?: any) => this.client.post(url, body, options);
      case HttpMethod.PUT:
        return (url: string, body: any, options?: any) => this.client.put(url, body, options);
      case HttpMethod.DELETE:
        // Wrap DELETE to match POST/PUT signature (ignore body parameter)
        return (url: string, body: any, options?: any) => this.client.delete(url, options);
      default:
        // Wrap GET to match POST/PUT signature (ignore body parameter)
        return (url: string, body: any, options?: any) => this.client.get(url, options);
    };
  }
}
