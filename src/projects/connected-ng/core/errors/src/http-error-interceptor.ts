import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ERROR_HANDLER_CONTRACT } from './error-handler-contract';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ERROR_HANDLER_CONTRACT, { optional: true });

  return next(req).pipe(
    catchError((err: unknown) => {
      try {
        if (err instanceof HttpErrorResponse) {
          const msg =
            (err.error?.message as string) ??
            (Array.isArray(err.error?.errors) ? err.error.errors.join('\n') : undefined) ??
            (typeof err.error === 'string' ? err.error : undefined) ??
            `Request failed (${err.status})`;

          if (errorService)
            errorService.onError(msg, err);
        }

      } catch { }

      console.error(err);

      // rethrow so the caller can still handle it
      return throwError(() => err);
    })
  );
};
