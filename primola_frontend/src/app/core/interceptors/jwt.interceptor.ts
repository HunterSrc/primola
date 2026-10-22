import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let modifiedReq = req;
  if (token && !req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/refresh')) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Se riceviamo 401 su una rotta protetta e abbiamo un refreshToken, proviamo il refresh
      if (error.status === 401 && !req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/refresh') && authService.getRefreshToken()) {
        return authService.refreshToken().pipe(
          switchMap((authRes) => {
            const newToken = authRes.data.accessToken;
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`
              }
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            authService.logout();
            return throwError(() => refreshErr);
          })
        );
      }

      if (error.status === 401 && !req.url.includes('/api/auth/login')) {
        authService.logout();
      }

      return throwError(() => error);
    })
  );
};
