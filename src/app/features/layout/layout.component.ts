import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class AppLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  navItems = [
    { id: 'dashboard',     label: 'Panel de Control', icon: 'grid_view',      route: '/dashboard' },
    { id: 'analitica',     label: 'Analítica',         icon: 'bar_chart',      route: '/analitica' },
    { id: 'politicas',     label: 'Políticas',          icon: 'policy',         route: '/politicas' },
    { id: 'tramites',      label: 'Trámites',           icon: 'folder_open',    route: '/tramites' },
    { id: 'documentos',    label: 'Documentos',         icon: 'description',    route: '/documentos' },
    { id: 'departamentos', label: 'Departamentos',      icon: 'apartment',      route: '/departamentos' },
    { id: 'usuarios',      label: 'Usuarios',           icon: 'group',          route: '/usuarios' },
    { id: 'monitor',       label: 'Monitor',            icon: 'monitor_heart',  route: '/monitor' },
    { id: 'formularios',   label: 'Formularios',        icon: 'dynamic_form',   route: '/formularios' },
  ];

  get currentUser() { return this.auth.getCurrentUser(); }

  get userInitials(): string {
    const name = this.currentUser?.username ?? 'U';
    return name.slice(0, 2).toUpperCase();
  }

  get userRole(): string {
    const roles = this.currentUser?.roles ?? [];
    if (roles.includes('ROLE_ADMIN')) return 'Administrador';
    if (roles.includes('ROLE_FUNCIONARIO')) return 'Funcionario';
    return 'Cliente';
  }

  get searchPlaceholder(): string {
    const url = this.router.url;
    if (url.includes('analitica'))     return 'Buscar analíticas...';
    if (url.includes('documentos'))    return 'Buscar documentos, contratos...';
    if (url.includes('departamentos')) return 'Buscar departamentos...';
    if (url.includes('tramites'))      return 'Buscar trámites o clientes...';
    if (url.includes('politicas'))     return 'Buscar políticas...';
    if (url.includes('usuarios'))      return 'Buscar usuarios...';
    if (url.includes('monitor'))       return 'Buscar eventos...';
    if (url.includes('perfil'))        return 'Buscar configuración...';
    return 'Buscar...';
  }

  logout(): void { this.auth.logout(); }
}
