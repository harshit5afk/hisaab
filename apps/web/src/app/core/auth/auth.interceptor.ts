import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();

  if (token && !req.headers.has('Authorization')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't intercept login or refresh requests
      if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        const refresh$ = authService.refresh();
        if (refresh$) {
          return refresh$.pipe(
            switchMap((newTokens) => {
              if (newTokens?.accessToken) {
                const retriedReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newTokens.accessToken}` },
                });
                return next(retriedReq);
              }
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => error);
            }),
            catchError((refreshErr) => {
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => refreshErr);
            }),
          );
        }

        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
