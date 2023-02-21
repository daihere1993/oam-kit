import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

export class CacheRouteStrategy implements RouteReuseStrategy {

  cachedRouteHandles = new Map<string, DetachedRouteHandle>();

  shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    if (future.routeConfig &&
      future.routeConfig.data &&
      future.routeConfig.data['reuse'] !== undefined
    ) {
      return future.routeConfig.data['reuse'];
    }
    return future.routeConfig === current.routeConfig;
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return route.routeConfig.data && route.routeConfig.data['reuse'] && this.cachedRouteHandles.has(this.getIndentity(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.cachedRouteHandles.get(this.getIndentity(route));
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.routeConfig.data && route.routeConfig.data['reuse'];
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    this.cachedRouteHandles.set(this.getIndentity(route), handle);
  }

  // Pitfall: route.routeConfig.path can not make sure the indentity of route
  // e.g. the path would be '' for centain routes
  private getIndentity(route: ActivatedRouteSnapshot): string {
    return route.component.name;
  }
}