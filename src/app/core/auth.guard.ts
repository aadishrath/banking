import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { BankingStoreService } from './banking-store.service';
import { Permission } from './models';

export const authGuard: CanActivateFn = () => {
  const store = inject(BankingStoreService);
  const router = inject(Router);
  return store.hasValidSession() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const store = inject(BankingStoreService);
  const router = inject(Router);
  return store.hasValidSession() ? router.createUrlTree(['/dashboard']) : true;
};

export const sessionMatchGuard: CanMatchFn = () => {
  const store = inject(BankingStoreService);
  const router = inject(Router);
  return store.hasValidSession() ? true : router.createUrlTree(['/login']);
};

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const store = inject(BankingStoreService);
  const router = inject(Router);
  const permission = route.data['permission'] as Permission | undefined;

  if (!store.hasValidSession()) {
    return router.createUrlTree(['/login']);
  }

  if (!permission || store.can(permission)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
