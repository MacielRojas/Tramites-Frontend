import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PolicyService, Policy } from '../../core/services/policy.service';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policies.component.html',
  styleUrl: './policies.component.scss'
})
export class PoliciesComponent implements OnInit {
  private policyService = inject(PolicyService);
  private router = inject(Router);

  policies = signal<Policy[]>([]);
  loading = signal(true);
  creating = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.policyService.getAll().subscribe({
      next: (data) => { this.policies.set(data); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar las políticas.'); this.loading.set(false); }
    });
  }

  newPolicy(): void {
    this.creating.set(true);
    this.error.set('');
    const ts = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const defaultDiagram = {
      lanes: [
        { id: 'l1', label: 'Cliente' },
        { id: 'l2', label: 'Sistema' },
        { id: 'l3', label: 'Validación' }
      ],
      nodes: [],
      edges: []
    };
    this.policyService.create({
      nombre: `Nuevo Flujo ${ts}`,
      descripcion: '',
      activa: false,
      diagramJson: JSON.stringify(defaultDiagram)
    }).subscribe({
      next: (p) => {
        this.creating.set(false);
        this.router.navigate(['/politicas/editor', p.id]);
      },
      error: (err) => {
        this.creating.set(false);
        if (err.status === 403) {
          this.error.set('Sin permisos. Solo Administradores pueden crear políticas.');
        } else if (err.status === 400 && typeof err.error === 'string') {
          this.error.set(err.error);
        } else {
          this.error.set(`Error al crear la política (${err.status}).`);
        }
      }
    });
  }

  editPolicy(id: string): void {
    this.router.navigate(['/politicas/editor', id]);
  }

  deletePolicy(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm('¿Eliminar esta política?')) return;
    this.policyService.delete(id).subscribe({
      next: () => this.policies.update(arr => arr.filter(p => p.id !== id)),
      error: () => this.error.set('Error al eliminar la política.')
    });
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
