import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Module-level lock to prevent concurrent token refresh calls
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();

  if (token && !req.headers.has('Authorization')) {
    req = req.clone({
      setHeaders: { Authorization: 'Bearer ' + token },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }
      if (error.status === 401) {
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    }),
  );
};

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((newToken) => {
        const retried = req.clone({
          setHeaders: { Authorization: 'Bearer ' + newToken },
        });
        return next(retried);
      }),
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  const refresh$ = authService.refresh();
  if (!refresh$) {
    isRefreshing = false;
    authService.logout();
    router.navigate(['/login']);
    return throwError(() => new Error('No refresh token available'));
  }

  return refresh$.pipe(
    switchMap((newTokens: any): Observable<HttpEvent<unknown>> => {
      isRefreshing = false;
      const newAccessToken = newTokens?.accessToken;
      if (newAccessToken) {
        refreshTokenSubject.next(newAccessToken);
        const retried = req.clone({
          setHeaders: { Authorization: 'Bearer ' + newAccessToken },
        });
        return next(retried);
      }
      authService.logout();
      router.navigate(['/login']);
      return throwError(() => new Error('Token refresh failed'));
    }),
    catchError((refreshErr): Observable<HttpEvent<unknown>> => {
      isRefreshing = false;
      refreshTokenSubject.next(null);
      authService.logout();
      router.navigate(['/login']);
      return throwError(() => refreshErr);
    }),
  );
}