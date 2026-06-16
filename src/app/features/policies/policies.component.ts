import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PolicyService, Policy } from '../../core/services/policy.service';
import { FormularioService } from '../../core/services/formulario.service';
import { FormularioPlantilla, TipoCampo, CampoFormulario } from '../../core/models/api.models';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policies.component.html',
  styleUrl: './policies.component.scss'
})
export class PoliciesComponent implements OnInit {
  private policyService = inject(PolicyService);
  private formSvc       = inject(FormularioService);
  private router        = inject(Router);

  policies      = signal<Policy[]>([]);
  loading       = signal(true);
  creating      = signal(false);
  error         = signal('');

  // ── Detail panel ──
  detailPolicy    = signal<Policy | null>(null);
  detailPlantilla = signal<FormularioPlantilla | null>(null);
  detailLoading   = signal(false);

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

  openDetail(policy: Policy, event?: MouseEvent): void {
    event?.stopPropagation();
    this.detailPolicy.set(policy);
    this.detailPlantilla.set(null);
    this.detailLoading.set(true);

    this.formSvc.getByPoliticaId(policy.id!).subscribe({
      next: p => {
        this.detailPlantilla.set(p);
        this.detailLoading.set(false);
      },
      error: () => {
        // No hay FormularioPlantilla → intentar auto-crear desde diagramJson
        this.autoSyncFromDiagram(policy);
      }
    });
  }

  private autoSyncFromDiagram(policy: Policy): void {
    this.policyService.getById(policy.id!).subscribe({
      next: fullPolicy => {
        const campos = this.extractCamposFromDiagram(fullPolicy.diagramJson);
        if (campos.length === 0) {
          this.detailLoading.set(false);
          return;
        }
        const plantilla: FormularioPlantilla = {
          nombre: `Formulario – ${policy.nombre}`,
          politicaId: policy.id!,
          campos
        };
        this.formSvc.create(plantilla).subscribe({
          next: p => { this.detailPlantilla.set(p); this.detailLoading.set(false); },
          error: () => { this.detailLoading.set(false); }
        });
      },
      error: () => { this.detailLoading.set(false); }
    });
  }

  private extractCamposFromDiagram(diagramJson?: string): CampoFormulario[] {
    if (!diagramJson) return [];
    try {
      const diagram = JSON.parse(diagramJson);
      const nodes: any[] = diagram.nodes ?? [];
      const campos: CampoFormulario[] = [];
      nodes
        .filter((n: any) => n.type === 'action' && Array.isArray(n.campos) && n.campos.length > 0)
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

  closeDetail(): void { this.detailPolicy.set(null); }

  editPolicy(id: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.router.navigate(['/politicas/editor', id]);
  }

  campoIcon(tipo: TipoCampo): string {
    const m: Record<string, string> = {
      TEXT: 'text_fields', TEXTAREA: 'notes', NUMBER: 'pin', DATE: 'calendar_today',
      CHECKLIST: 'checklist', SELECTOR: 'list', RADIO: 'radio_button_checked', GRID: 'table_chart',
    };
    return m[tipo] ?? 'input';
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
