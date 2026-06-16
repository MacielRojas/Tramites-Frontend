import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-cliente-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './cliente-layout.component.html',
  styleUrl: './cliente-layout.component.scss'
})
export class ClienteLayoutComponent {
  private auth = inject(AuthService);

  navItems: NavItem[] = [
    { label: 'Mis Trámites',  icon: 'folder_open',     route: '/cliente/dashboard' },
    { label: 'Nuevo Trámite', icon: 'add_circle',       route: '/cliente/tramites/nuevo' },
    { label: 'Asistente IA',  icon: 'smart_toy',        route: '/cliente/asistente-ia' },
    { label: 'Mi Perfil',     icon: 'manage_accounts',  route: '/cliente/perfil' },
  ];

  get userName(): string  { return this.auth.getCurrentUser()?.username ?? 'Cliente'; }
  get userInitials(): string { return this.userName.slice(0, 2).toUpperCase(); }

  logout(): void { this.auth.logout(); }
}
