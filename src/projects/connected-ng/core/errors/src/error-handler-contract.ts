import { HttpContextToken } from "@angular/common/http";
import { InjectionToken } from "@angular/core";

export interface ErrorHandlerContract {
  onError: (message: string, error?: Error, data?: any) => void;
}

export const ERROR_HANDLER_CONTRACT = new InjectionToken<ErrorHandlerContract>('ERROR_HANDLER_CONTRACT');

export const HTTP_ERROR_HANDLING_MODE = new HttpContextToken<'global' | 'silent' | 'local'>(() => 'global');
