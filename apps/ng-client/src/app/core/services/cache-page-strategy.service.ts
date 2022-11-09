import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { AppRoute } from '@ng-client/app-routing.module';

/**
 * Use to cache loaded page which should be cached.
 * To cache a page, need set cached to true in routing configuration.
 */
export class CacheRouteStrategy implements RouteReuseStrategy {

  cachedRouteHandles = new Map<string, DetachedRouteHandle>();

  /**
   * Would be called when navigate between routes.
   * Return true means keep using current component, or else loading a component the future route pointed to
   * @param future The future route app is gonna go
   * @param current The current route
   */
  shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === current.routeConfig;
  }

  /**
   * Called when loading a new route.
   * Return true means would use another cached page component by retrieve interface.
   * @param route The future current route
   */
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return (route.routeConfig as AppRoute)?.shouldCache && this.cachedRouteHandles.has(this.getPath(route));
  }

  /**
   * Called when shouldAttached return true.
   * DetachedRouteHandle is a object which including a component reference and corresponding scope.
   * Here would reture the cached page component.
   * @param route The current route
   */
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.cachedRouteHandles.get(this.getPath(route));
  }

  /**
   * Called when leaving current route.
   * Return true means would cache current page component by store interface.
   * @param route The current route
   */
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return (route.routeConfig as AppRoute)?.shouldCache;
  }

  /**
   * Called when shouldDetach return true.
   * Here to cache a route that need to be cached.
   * @param route The current route
   * @param handle DetachedRouteHandle of current route
   */
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    if ((route.routeConfig as AppRoute)?.shouldCache) {
      this.cachedRouteHandles.set(this.getPath(route), handle);
    }
  }

  private getPath(route: ActivatedRouteSnapshot): string {
    return route?.routeConfig?.path || '';
  }
}
