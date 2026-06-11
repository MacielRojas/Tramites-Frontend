import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/layout/layout.component').then(m => m.AppLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'analitica',
        loadComponent: () =>
          import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
      },
      {
        path: 'politicas',
        loadComponent: () =>
          import('./features/policies/policies.component').then(m => m.PoliciesComponent),
      },
      {
        path: 'politicas/editor/:id',
        loadComponent: () =>
          import('./features/policies/editor/policy-editor.component').then(m => m.PolicyEditorComponent),
      },
      {
        path: 'tramites',
        loadComponent: () =>
          import('./features/tramites/tramites.component').then(m => m.TramitesComponent),
      },
      {
        path: 'documentos',
        loadComponent: () =>
          import('./features/documents/documents.component').then(m => m.DocumentsComponent),
      },
      {
        path: 'departamentos',
        loadComponent: () =>
          import('./features/departments/departments.component').then(m => m.DepartmentsComponent),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'monitor',
        loadComponent: () =>
          import('./features/monitor/monitor.component').then(m => m.MonitorComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: '/login' },
];
