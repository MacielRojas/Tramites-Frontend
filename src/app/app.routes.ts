import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { funcionarioGuard } from './core/guards/funcionario.guard';
import { clienteGuard } from './core/guards/cliente.guard';

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

  // ── Admin / main layout ─────────────────────────────────────────────────────
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
        path: 'formularios',
        loadComponent: () =>
          import('./features/formularios/formularios.component').then(m => m.FormulariosComponent),
      },
      {
        path: 'formularios/editor',
        loadComponent: () =>
          import('./features/formularios/editor/form-editor.component').then(m => m.FormEditorComponent),
      },
      {
        path: 'formularios/editor/:id',
        loadComponent: () =>
          import('./features/formularios/editor/form-editor.component').then(m => m.FormEditorComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },

  // ── Funcionario module ──────────────────────────────────────────────────────
  {
    path: 'funcionario',
    loadComponent: () =>
      import('./features/funcionario/funcionario-layout/funcionario-layout.component').then(m => m.FuncionarioLayoutComponent),
    canActivate: [funcionarioGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/funcionario/dashboard/func-dashboard.component').then(m => m.FuncDashboardComponent),
      },
      {
        path: 'tramites/detalle/:id',
        loadComponent: () =>
          import('./features/funcionario/tramite-detalle/func-tramite-detalle.component').then(m => m.FuncTramiteDetalleComponent),
      },
      {
        path: 'actividades/detalle/:id',
        loadComponent: () =>
          import('./features/funcionario/actividad-detalle/func-actividad-detalle.component').then(m => m.FuncActividadDetalleComponent),
      },
      {
        path: 'documentos',
        loadComponent: () =>
          import('./features/funcionario/documentos/func-documentos.component').then(m => m.FuncDocumentosComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/funcionario/perfil/func-perfil.component').then(m => m.FuncPerfilComponent),
      },
    ],
  },

  // ── Cliente module ──────────────────────────────────────────────────────────
  {
    path: 'cliente',
    loadComponent: () =>
      import('./features/cliente/cliente-layout/cliente-layout.component').then(m => m.ClienteLayoutComponent),
    canActivate: [clienteGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/cliente/dashboard/cli-dashboard.component').then(m => m.CliDashboardComponent),
      },
      {
        path: 'tramites/nuevo',
        loadComponent: () =>
          import('./features/cliente/tramite-nuevo/cli-tramite-nuevo.component').then(m => m.CliTramiteNuevoComponent),
      },
      {
        path: 'tramites/detalle/:id',
        loadComponent: () =>
          import('./features/cliente/tramite-detalle/cli-tramite-detalle.component').then(m => m.CliTramiteDetalleComponent),
      },
      {
        path: 'asistente-ia',
        loadComponent: () =>
          import('./features/cliente/asistente-ia/cli-asistente-ia.component').then(m => m.CliAsistenteIaComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/cliente/perfil/cli-perfil.component').then(m => m.CliPerfilComponent),
      },
    ],
  },

  { path: '**', redirectTo: '/login' },
];
