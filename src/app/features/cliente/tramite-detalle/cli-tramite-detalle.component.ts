import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { FormularioService } from '../../../core/services/formulario.service';
import { Tramite, Actividad, ActividadEstado, FormularioPlantilla, RespuestaFormulario } from '../../../core/models/api.models';
import { FormRendererComponent } from '../../../shared/components/form-renderer/form-renderer.component';

@Component({
  selector: 'app-cli-tramite-detalle',
  standalone: true,
  imports: [CommonModule, FormRendererComponent],
  templateUrl: './cli-tramite-detalle.component.html',
  styleUrl: './cli-tramite-detalle.component.scss'
})
export class CliTramiteDetalleComponent implements OnInit {
  private api     = inject(TramitesApiService);
  private formSvc = inject(FormularioService);
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);

  tramite     = signal<Tramite | null>(null);
  actividades = signal<Actividad[]>([]);
  loading     = signal(true);
  error       = signal('');

  respuestas  = signal<RespuestaFormulario[]>([]);
  plantillas  = signal<Map<string, FormularioPlantilla>>(new Map());

  get id(): string { return this.route.snapshot.paramMap.get('id') ?? ''; }

  ngOnInit(): void {
    this.api.getTramiteById(this.id).subscribe({
      next: t => {
        this.tramite.set(t);
        this.api.getActividades(this.id).subscribe({
          next: a => {
            this.actividades.set(a);
            this.loading.set(false);
            this.loadFormularios(a);
          },
          error: () => { this.loading.set(false); }
        });
      },
      error: () => { this.error.set('No se pudo cargar el trámite.'); this.loading.set(false); }
    });
  }

  private loadFormularios(actividades: Actividad[]): void {
    this.formSvc.getRespuestasPorTramite(this.id).subscribe({
      next: resp => {
        this.respuestas.set(resp);
        const plantillaIds = [...new Set(
          actividades
            .filter(a => a.formularioPlantillaId)
            .map(a => a.formularioPlantillaId!)
        )];
        plantillaIds.forEach(pid => {
          this.formSvc.getById(pid).subscribe({
            next: p => this.plantillas.update(m => new Map(m).set(pid, p)),
            error: () => {}
          });
        });
      },
      error: () => {}
    });
  }

  getRespuestaParaActividad(actId: string): RespuestaFormulario | undefined {
    return this.respuestas().find(r => r.actividadId === actId);
  }

  getPlantillaParaActividad(a: Actividad): FormularioPlantilla | undefined {
    if (!a.formularioPlantillaId) return undefined;
    return this.plantillas().get(a.formularioPlantillaId);
  }

  goBack(): void { this.router.navigate(['/cliente/dashboard']); }

  estadoClass(e: string): string {
    const m: Record<string, string> = {
      PENDIENTE: 'estado--pending', EN_PROCESO: 'estado--process',
      COMPLETADO: 'estado--done', RECHAZADO: 'estado--rejected',
      CANCELADO: 'estado--cancelled', OMITIDO: 'estado--cancelled', BLOQUEADO: 'estado--cancelled'
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

  progressPercent(): number {
    const acts = this.actividades();
    if (!acts.length) return 0;
    const done = acts.filter(a => a.estado === 'COMPLETADO').length;
    return Math.round((done / acts.length) * 100);
  }
}
