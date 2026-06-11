import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-funcionario-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './funcionario-layout.component.html',
  styleUrl: './funcionario-layout.component.scss'
})
export class FuncionarioLayoutComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  navItems = [
    { id: 'dashboard',   label: 'Mis Trámites',  icon: 'assignment',      route: '/funcionario/dashboard' },
    { id: 'documentos',  label: 'Documentos',     icon: 'folder_open',     route: '/funcionario/documentos' },
    { id: 'perfil',      label: 'Mi Perfil',      icon: 'manage_accounts', route: '/funcionario/perfil' },
  ];

  get currentUser() { return this.auth.getCurrentUser(); }

  get userInitials(): string {
    return (this.currentUser?.username ?? 'F').slice(0, 2).toUpperCase();
  }

  logout(): void { this.auth.logout(); }
}
