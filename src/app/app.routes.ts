import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard, sessionMatchGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login-page.component').then((module) => module.LoginPageComponent)
  },
  {
    path: '',
    canMatch: [sessionMatchGuard],
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shell/app-shell.component').then((module) => module.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard-page.component').then((module) => module.DashboardPageComponent)
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./pages/accounts-page.component').then((module) => module.AccountsPageComponent)
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./pages/payments-page.component').then((module) => module.PaymentsPageComponent)
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./pages/activity-page.component').then((module) => module.ActivityPageComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile-page.component').then((module) => module.ProfilePageComponent)
      },
      {
        path: 'company',
        canActivate: [permissionGuard],
        data: { permission: 'view_company_hub' },
        loadComponent: () =>
          import('./pages/company-page.component').then((module) => module.CompanyPageComponent)
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permission: 'manage_users' },
        loadComponent: () =>
          import('./pages/user-management-page.component').then(
            (module) => module.UserManagementPageComponent
          )
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
