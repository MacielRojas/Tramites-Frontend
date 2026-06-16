import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { Tramite, TramiteEstado } from '../../../core/models/api.models';

@Component({
  selector: 'app-cli-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cli-dashboard.component.html',
  styleUrl: './cli-dashboard.component.scss'
})
export class CliDashboardComponent implements OnInit {
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

  readonly estados: (TramiteEstado | 'TODOS')[] = ['TODOS', 'PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'RECHAZADO', 'CANCELADO'];

  ngOnInit(): void {
    this.api.getMisTramites().subscribe({
      next:  t  => { this.tramites.set(t); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar tus trámites.'); this.loading.set(false); }
    });
  }

  openDetalle(id: string): void { this.router.navigate(['/cliente/tramites/detalle', id]); }
  nuevoTramite(): void { this.router.navigate(['/cliente/tramites/nuevo']); }

  estadoClass(e: TramiteEstado): string {
    const m: Record<TramiteEstado, string> = {
      PENDIENTE: 'estado--pending', EN_PROCESO: 'estado--process',
      COMPLETADO: 'estado--done', RECHAZADO: 'estado--rejected', CANCELADO: 'estado--cancelled'
    };
    return m[e] ?? '';
  }

  estadoIcon(e: TramiteEstado): string {
    const m: Record<TramiteEstado, string> = {
      PENDIENTE: 'hourglass_empty', EN_PROCESO: 'pending', COMPLETADO: 'check_circle',
      RECHAZADO: 'cancel', CANCELADO: 'block'
    };
    return m[e] ?? 'folder';
  }
}
