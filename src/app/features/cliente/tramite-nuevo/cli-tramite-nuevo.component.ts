import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { FormularioService } from '../../../core/services/formulario.service';
import { PolicyService } from '../../../core/services/policy.service';
import { Politica, FormularioPlantilla, TipoCampo, CampoFormulario } from '../../../core/models/api.models';

@Component({
  selector: 'app-cli-tramite-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cli-tramite-nuevo.component.html',
  styleUrl: './cli-tramite-nuevo.component.scss'
})
export class CliTramiteNuevoComponent implements OnInit {
  private api         = inject(TramitesApiService);
  private formSvc     = inject(FormularioService);
  private policyService = inject(PolicyService);
  private router      = inject(Router);

  politicas        = signal<Politica[]>([]);
  loadingPols      = signal(true);
  plantilla        = signal<FormularioPlantilla | null>(null);
  loadingPlantilla = signal(false);

  form = {
    titulo:      '',
    descripcion: '',
    politicaId:  '',
  };

  formValues = signal<Record<string, unknown>>({});

  submitting = signal(false);
  error      = signal('');

  onCampoChange(campoId: string, value: unknown): void {
    this.formValues.update(v => ({ ...v, [campoId]: value }));
  }

  get isValid(): boolean {
    return this.form.titulo.trim().length > 0 && this.form.politicaId.length > 0;
  }

  ngOnInit(): void {
    this.api.getPoliticas().subscribe({
      next:  p => { this.politicas.set(p); this.loadingPols.set(false); },
      error: () => { this.loadingPols.set(false); }
    });
  }

  onPoliticaChange(id: string): void {
    this.form.politicaId = id;
    this.plantilla.set(null);
    if (!id) return;
    this.loadingPlantilla.set(true);
    this.formSvc.getByPoliticaId(id).subscribe({
      next:  p => { this.plantilla.set(p); this.loadingPlantilla.set(false); },
      error: () => {
        // No hay FormularioPlantilla → intentar auto-crear desde diagramJson
        this.autoSyncFromDiagram(id);
      }
    });
  }

  private autoSyncFromDiagram(politicaId: string): void {
    this.policyService.getById(politicaId).subscribe({
      next: policy => {
        const campos = this.extractCamposFromDiagram(policy.diagramJson);
        if (campos.length === 0) {
          this.loadingPlantilla.set(false);
          return;
        }
        const plantilla: FormularioPlantilla = {
          nombre: `Formulario – ${policy.nombre}`,
          politicaId,
          campos
        };
        this.formSvc.create(plantilla).subscribe({
          next: p => { this.plantilla.set(p); this.loadingPlantilla.set(false); },
          error: () => { this.loadingPlantilla.set(false); }
        });
      },
      error: () => { this.loadingPlantilla.set(false); }
    });
  }

  private extractCamposFromDiagram(diagramJson?: string): CampoFormulario[] {
    if (!diagramJson) return [];
    try {
      const diagram = JSON.parse(diagramJson);
      const nodes: any[] = diagram.nodes ?? [];
      const campos: CampoFormulario[] = [];
      nodes
        .filter((n: any) => n.type === 'activity' && Array.isArray(n.campos) && n.campos.length > 0)
        .forEach((n: any) => {
          n.campos.forEach((c: any) => {
            campos.push({
              id: c.id,
              etiqueta: c.etiqueta,
              tipo: this.mapTipoCampo(c.tipo),
              requerido: c.requerido ?? false,
              orden: campos.length + 1
            });
          });
        });
      return campos;
    } catch { return []; }
  }

  private mapTipoCampo(t: string): TipoCampo {
    if (t === 'SELECT')   return 'SELECTOR';
    if (t === 'CHECKBOX') return 'CHECKLIST';
    if (t === 'FILE')     return 'TEXT';
    return t as TipoCampo;
  }

  campoIcon(tipo: TipoCampo): string {
    const icons: Record<string, string> = {
      TEXT: 'text_fields', TEXTAREA: 'notes', NUMBER: 'pin', DATE: 'calendar_today',
      CHECKLIST: 'checklist', SELECTOR: 'list', RADIO: 'radio_button_checked', GRID: 'table_chart',
    };
    return icons[tipo] ?? 'input';
  }

  submit(): void {
    if (!this.isValid) return;
    this.submitting.set(true); this.error.set('');
    this.api.createTramite(
      this.form.politicaId,
      this.form.titulo.trim(),
      this.form.descripcion.trim(),
      this.formValues()
    ).subscribe({
      next: t => this.router.navigate(['/cliente/tramites/detalle', t.id]),
      error: (e: any) => {
        this.error.set(e.error?.message ?? 'Error al crear el trámite.');
        this.submitting.set(false);
      }
    });
  }

  cancel(): void { this.router.navigate(['/cliente/dashboard']); }
}
