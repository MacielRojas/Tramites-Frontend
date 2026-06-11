import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface RecentUser {
  initials: string;
  name: string;
  role: string;
  status: 'activo' | 'ausente' | 'suspendido';
  date: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private router = inject(Router);

  recentUsers: RecentUser[] = [
    { initials: 'AM', name: 'Alice Morgan',   role: 'Revisor',       status: 'activo',     date: 'Oct 12, 2023' },
    { initials: 'BC', name: 'Benjamin Chen',  role: 'Asesor Legal',  status: 'activo',     date: 'Oct 09, 2023' },
    { initials: 'DR', name: 'Diana Rose',     role: 'Contribuyente', status: 'ausente',    date: 'Sep 28, 2023' },
    { initials: 'EK', name: 'Evan Knight',    role: 'Gerente',       status: 'suspendido', date: 'Sep 15, 2023' },
  ];

  showNewTramiteModal = signal(false);
  newTramiteForm = { name: '', client: '', status: 'Pendiente', priority: 'Media' };

  go(route: string): void { this.router.navigate([route]); }

  exportReport(): void {
    const rows = [
      ['Panel de Control — TramiteFlow', '', ''],
      ['Fecha', new Date().toLocaleDateString('es-ES'), ''],
      ['', '', ''],
      ['Métrica', 'Valor', 'Variación'],
      ['Total Trámites', '2842', '+12.5%'],
      ['Usuarios Activos', '1120', '+4.2%'],
      ['Tareas Pendientes', '45', '-2.1%'],
      ['', '', ''],
      ['Usuario', 'Rol', 'Estado', 'Ingreso'],
      ...this.recentUsers.map(u => [u.name, u.role, u.status, u.date]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dashboard_reporte.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  openNewTramite(): void {
    this.newTramiteForm = { name: '', client: '', status: 'Pendiente', priority: 'Media' };
    this.showNewTramiteModal.set(true);
  }

  submitNewTramite(): void {
    if (!this.newTramiteForm.name.trim()) return;
    this.showNewTramiteModal.set(false);
    this.router.navigate(['/tramites']);
  }
}
