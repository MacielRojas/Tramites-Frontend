import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { FormularioService } from '../../../core/services/formulario.service';
import { Actividad, Comentario, FormularioPlantilla, RespuestaFormulario } from '../../../core/models/api.models';
import { FormRendererComponent } from '../../../shared/components/form-renderer/form-renderer.component';

@Component({
  selector: 'app-func-actividad-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, FormRendererComponent],
  templateUrl: './func-actividad-detalle.component.html',
  styleUrl: './func-actividad-detalle.component.scss'
})
export class FuncActividadDetalleComponent implements OnInit {
  private api      = inject(TramitesApiService);
  private formSvc  = inject(FormularioService);
  private route    = inject(ActivatedRoute);
  router           = inject(Router);

  actividad        = signal<Actividad | null>(null);
  loading          = signal(true);
  actionLoading    = signal(false);
  error            = signal('');
  success          = signal('');
  nuevoComentario  = signal('');

  plantilla        = signal<FormularioPlantilla | null>(null);
  respuesta        = signal<RespuestaFormulario | null>(null);
  formEnviado      = signal(false);
  formLoading      = signal(false);

  get id(): string { return this.route.snapshot.paramMap.get('id') ?? ''; }

  ngOnInit(): void {
    this.api.getActividadById(this.id).subscribe({
      next: a => {
        this.actividad.set(a);
        this.loading.set(false);
        if (a.formularioPlantillaId) {
          this.formSvc.getById(a.formularioPlantillaId).subscribe({
            next: p => this.plantilla.set(p),
            error: () => {}
          });
          if (a.respuestaFormularioId) {
            this.formSvc.getRespuestaPorActividad(a.id).subscribe({
              next: r => { this.respuesta.set(r); this.formEnviado.set(true); },
              error: () => {}
            });
          }
        }
      },
      error: () => { this.error.set('No se pudo cargar la actividad.'); this.loading.set(false); }
    });
  }

  onFormSubmit(valores: Record<string, unknown>): void {
    this.formLoading.set(true);
    this.error.set('');
    this.formSvc.submitRespuesta(this.id, valores).subscribe({
      next: r => {
        this.respuesta.set(r);
        this.formEnviado.set(true);
        this.formLoading.set(false);
        // Si la actividad estaba PENDIENTE, iniciarla automáticamente
        if (this.actividad()?.estado === 'PENDIENTE') {
          this.iniciar();
        } else {
          this.success.set('Formulario enviado. Ahora puedes completar la actividad.');
          setTimeout(() => this.success.set(''), 4000);
        }
      },
      error: () => {
        this.error.set('No se pudo guardar el formulario.');
        this.formLoading.set(false);
      }
    });
  }

  canEditForm(): boolean {
    const e = this.actividad()?.estado;
    return e === 'PENDIENTE' || e === 'EN_PROCESO';
  }

  iniciar(): void   { this.doAction(() => this.api.iniciarActividad(this.id),   'Actividad iniciada.'); }
  completar(): void { this.doAction(() => this.api.completarActividad(this.id), 'Actividad completada.'); }
  omitir(): void    { this.doAction(() => this.api.omitirActividad(this.id),    'Actividad omitida.'); }

  private doAction(fn: () => any, msg: string): void {
    this.actionLoading.set(true);
    this.error.set(''); this.success.set('');
    fn().subscribe({
      next: (a: Actividad) => {
        this.actividad.set(a);
        this.success.set(msg);
        this.actionLoading.set(false);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e: any) => {
        this.error.set(e.error?.message ?? 'Error al ejecutar la acción.');
        this.actionLoading.set(false);
      }
    });
  }

  addComentario(): void {
    const texto = this.nuevoComentario().trim();
    if (!texto) return;
    this.api.agregarComentario(this.id, texto).subscribe({
      next: (c: Comentario) => {
        this.actividad.update(a => a ? {
          ...a, comentarios: [...(a.comentarios ?? []), c]
        } : a);
        this.nuevoComentario.set('');
      },
      error: () => { this.error.set('No se pudo agregar el comentario.'); }
    });
  }

  goBack(): void {
    const tramiteId = this.actividad()?.tramiteId;
    if (tramiteId) this.router.navigate(['/funcionario/tramites/detalle', tramiteId]);
    else this.router.navigate(['/funcionario/dashboard']);
  }

  estadoClass(e: string): string {
    const m: Record<string, string> = {
      BLOQUEADO: 'estado--cancelled', PENDIENTE: 'estado--pending',
      EN_PROCESO: 'estado--process', COMPLETADO: 'estado--done', OMITIDO: 'estado--cancelled',
    };
    return m[e] ?? '';
  }

  canIniciar():   boolean { return this.actividad()?.estado === 'PENDIENTE'; }
  canCompletar(): boolean { return this.actividad()?.estado === 'EN_PROCESO'; }
  canOmitir():    boolean {
    const e = this.actividad()?.estado;
    return e === 'PENDIENTE' || e === 'EN_PROCESO';
  }
}
