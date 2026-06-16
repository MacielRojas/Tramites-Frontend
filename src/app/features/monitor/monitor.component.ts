import { Component, signal, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface EventoMonitor {
  tipo: 'create' | 'update' | 'delete' | 'error';
  usuario: string;
  accion: string;
  modulo: string;
  fecha: string;
}

interface MonitorStats {
  totalTramites: number;
  tramitesAbiertos: number;
  tramitesCompletados: number;
  actividadesPendientes: number;
}

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss'
})
export class MonitorComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private pollRef: ReturnType<typeof setInterval> | null = null;

  isLive   = signal(true);
  loading  = signal(true);
  error    = signal('');
  events   = signal<EventoMonitor[]>([]);
  stats    = signal<MonitorStats>({ totalTramites: 0, tramitesAbiertos: 0, tramitesCompletados: 0, actividadesPendientes: 0 });

  ngOnInit(): void {
    this.fetch();
    this.startPoll();
  }

  ngOnDestroy(): void { this.stopPoll(); }

  toggleLive(): void {
    if (this.isLive()) { this.stopPoll(); this.isLive.set(false); }
    else               { this.startPoll(); this.isLive.set(true); this.fetch(); }
  }

  clearLog(): void { this.events.set([]); }

  private fetch(): void {
    this.http.get<EventoMonitor[]>('/api/monitor/eventos?limit=60').subscribe({
      next: ev => { this.events.set(ev); this.loading.set(false); this.error.set(''); },
      error: () => { this.error.set('No se pudieron cargar los eventos.'); this.loading.set(false); }
    });
    this.http.get<MonitorStats>('/api/monitor/stats').subscribe({
      next: s => this.stats.set(s),
      error: () => {}
    });
  }

  private startPoll(): void {
    this.pollRef = setInterval(() => this.fetch(), 4000);
  }

  private stopPoll(): void {
    if (this.pollRef) { clearInterval(this.pollRef); this.pollRef = null; }
  }

  typeIcon(t: string): string {
    const map: Record<string, string> = {
      create: 'add_circle', update: 'edit', delete: 'delete', error: 'error'
    };
    return map[t] ?? 'circle';
  }

  typeClass(t: string): string {
    const map: Record<string, string> = {
      create: 'ev--create', update: 'ev--update', delete: 'ev--delete', error: 'ev--error'
    };
    return map[t] ?? '';
  }

  moduloClass(m: string): string {
    const map: Record<string, string> = {
      'Trámites':    'mod--tramites',
      'Actividades': 'mod--actividades',
      'Documentos':  'mod--documentos',
      'Políticas':   'mod--politicas',
      'Sistema':     'mod--sistema',
    };
    return map[m] ?? 'mod--default';
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  isToday(iso: string): boolean {
    const d = new Date(iso);
    const now = new Date();
    return d.getDate() === now.getDate()
        && d.getMonth() === now.getMonth()
        && d.getFullYear() === now.getFullYear();
  }
}
