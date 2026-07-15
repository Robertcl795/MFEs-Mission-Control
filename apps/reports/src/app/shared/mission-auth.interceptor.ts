import type { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { getBridge } from '@mission/bridge';

/**
 * Angular HttpInterceptorFn adapter over the bridge's HTTP enrichment.
 * The token never touches this remote: `session.authorizeRequest` builds
 * the headers inside the host-owned session closure.
 */
export const missionAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const { session } = getBridge();
  return from(session.authorizeRequest()).pipe(
    switchMap((init) => {
      let headers = req.headers.set('X-Mission-App', 'reports');
      new Headers(init.headers).forEach((value, key) => {
        headers = headers.set(key, value);
      });
      return next(req.clone({ headers }));
    }),
  );
};
