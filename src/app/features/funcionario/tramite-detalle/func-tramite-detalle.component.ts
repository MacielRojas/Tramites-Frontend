import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { Tramite, Actividad, ActividadEstado } from '../../../core/models/api.models';

@Component({
  selector: 'app-func-tramite-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './func-tramite-detalle.component.html',
  styleUrl: './func-tramite-detalle.component.scss'
})
export class FuncTramiteDetalleComponent implements OnInit {
  private api    = inject(TramitesApiService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  tramite     = signal<Tramite | null>(null);
  actividades = signal<Actividad[]>([]);
  loading     = signal(true);
  error       = signal('');

  get id(): string { return this.route.snapshot.paramMap.get('id') ?? ''; }

  ngOnInit(): void {
    this.api.getTramiteById(this.id).subscribe({
      next: t => {
        this.tramite.set(t);
        this.loadActividades();
      },
      error: () => { this.error.set('No se pudo cargar el trámite.'); this.loading.set(false); }
    });
  }

  private loadActividades(): void {
    this.api.getActividades(this.id).subscribe({
      next:  a => { this.actividades.set(a); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  openActividad(actId: string): void {
    this.router.navigate(['/funcionario/actividades/detalle', actId]);
  }

  goBack(): void { this.router.navigate(['/funcionario/dashboard']); }

  estadoClass(e: string): string {
    const m: Record<string, string> = {
      PENDIENTE: 'estado--pending', EN_PROCESO: 'estado--process',
      COMPLETADO: 'estado--done', OMITIDO: 'estado--cancelled',
      BLOQUEADO: 'estado--cancelled', RECHAZADO: 'estado--rejected'
    };
    return m[e] ?? '';
  }

  actIcon(e: ActividadEstado): string {
    const m: Record<ActividadEstado, string> = {
      BLOQUEADO: 'lock', PENDIENTE: 'radio_button_unchecked',
      EN_PROCESO: 'pending', COMPLETADO: 'check_circle', OMITIDO: 'cancel'
    };
    return m[e] ?? 'help';
  }
}
