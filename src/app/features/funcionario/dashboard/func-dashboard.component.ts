import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { Tramite, TramiteEstado } from '../../../core/models/api.models';

@Component({
  selector: 'app-func-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './func-dashboard.component.html',
  styleUrl: './func-dashboard.component.scss'
})
export class FuncDashboardComponent implements OnInit {
  private api    = inject(TramitesApiService);
  private router = inject(Router);

  tramites     = signal<Tramite[]>([]);
  loading      = signal(true);
  error        = signal('');
  filterEstado = signal<TramiteEstado | 'TODOS'>('TODOS');

  filtered = computed(() => {
    const f = this.filterEstado();
    return f === 'TODOS' ? this.tramites() : this.tramites().filter(t => t.estado === f);
  });

  readonly estados: (TramiteEstado | 'TODOS')[] = ['TODOS', 'PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'RECHAZADO'];

  ngOnInit(): void {
    this.api.getAllTramites().subscribe({
      next:  t  => { this.tramites.set(t); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los trámites.'); this.loading.set(false); }
    });
  }

  openTramite(id: string): void {
    this.router.navigate(['/funcionario/tramites/detalle', id]);
  }

  estadoClass(e: TramiteEstado): string {
    const m: Record<TramiteEstado, string> = {
      PENDIENTE: 'estado--pending', EN_PROCESO: 'estado--process',
      COMPLETADO: 'estado--done', RECHAZADO: 'estado--rejected', CANCELADO: 'estado--cancelled'
    };
    return m[e] ?? '';
  }
}
