import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ActivityEvent {
  id: number;
  type: 'create' | 'update' | 'delete' | 'login' | 'error' | 'export';
  user: string;
  action: string;
  module: string;
  timestamp: Date;
}

interface LiveStat {
  label: string;
  value: string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
}

const USERS   = ['alice.morgan','benjamin.chen','sofia.luna','mateo.garcia','diana.rose','admin'];
const ACTIONS: { type: ActivityEvent['type']; texts: string[]; module: string }[] = [
  { type: 'create', texts: ['Creó un trámite','Registró nuevo documento','Creó usuario'], module: 'Trámites' },
  { type: 'update', texts: ['Actualizó estado','Editó departamento','Modificó política'], module: 'Políticas' },
  { type: 'login',  texts: ['Inició sesión','Accedió al sistema'], module: 'Autenticación' },
  { type: 'export', texts: ['Exportó reporte','Descargó documentos'], module: 'Documentos' },
  { type: 'delete', texts: ['Eliminó archivo','Borró trámite'], module: 'Documentos' },
  { type: 'error',  texts: ['Error de validación','Acceso denegado'], module: 'Sistema' },
];

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss'
})
export class MonitorComponent implements OnDestroy {
  private eventId = 1;
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  isLive    = signal(true);
  maxEvents = 50;

  liveStats: LiveStat[] = [
    { label: 'Sesiones Activas',  value: '24',   icon: 'sensors',          trend: 'stable' },
    { label: 'Eventos / min',     value: '12',   icon: 'speed',            trend: 'up'     },
    { label: 'Trámites Abiertos', value: '124',  icon: 'folder_open',      trend: 'up'     },
    { label: 'Alertas',           value: '3',    icon: 'warning_amber',    trend: 'down'   },
  ];

  events = signal<ActivityEvent[]>(this.seedEvents());

  constructor() { this.startLive(); }

  ngOnDestroy(): void { this.stopLive(); }

  toggleLive(): void {
    if (this.isLive()) { this.stopLive(); this.isLive.set(false); }
    else               { this.startLive(); this.isLive.set(true); }
  }

  clearLog(): void { this.events.set([]); }

  private startLive(): void {
    this.intervalRef = setInterval(() => {
      this.addEvent(this.randomEvent());
      // update a random stat slightly
      const idx = Math.floor(Math.random() * this.liveStats.length);
      const cur = parseInt(this.liveStats[idx].value);
      const delta = Math.floor(Math.random() * 3) - 1;
      this.liveStats[idx] = { ...this.liveStats[idx], value: String(Math.max(0, cur + delta)) };
    }, 2500);
  }

  private stopLive(): void {
    if (this.intervalRef) { clearInterval(this.intervalRef); this.intervalRef = null; }
  }

  private addEvent(ev: ActivityEvent): void {
    this.events.update(list => {
      const next = [ev, ...list];
      return next.length > this.maxEvents ? next.slice(0, this.maxEvents) : next;
    });
  }

  private randomEvent(): ActivityEvent {
    const a   = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const txt = a.texts[Math.floor(Math.random() * a.texts.length)];
    return {
      id:        this.eventId++,
      type:      a.type,
      user:      USERS[Math.floor(Math.random() * USERS.length)],
      action:    txt,
      module:    a.module,
      timestamp: new Date(),
    };
  }

  private seedEvents(): ActivityEvent[] {
    return Array.from({ length: 12 }, (_, i) => {
      const ev = this.randomEvent();
      ev.timestamp = new Date(Date.now() - (12 - i) * 18000);
      return ev;
    });
  }

  typeIcon(t: ActivityEvent['type']): string {
    const map: Record<ActivityEvent['type'], string> = {
      create: 'add_circle', update: 'edit', delete: 'delete',
      login: 'login', error: 'error', export: 'download'
    };
    return map[t];
  }

  typeClass(t: ActivityEvent['type']): string {
    const map: Record<ActivityEvent['type'], string> = {
      create: 'ev--create', update: 'ev--update', delete: 'ev--delete',
      login: 'ev--login', error: 'ev--error', export: 'ev--export'
    };
    return map[t];
  }

  formatTime(d: Date): string {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
