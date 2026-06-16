import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { FormularioService } from '../../../core/services/formulario.service';
import { Tramite, Actividad, ActividadEstado, TramiteEstado, Documento, FormularioPlantilla, TipoCampo } from '../../../core/models/api.models';
import { PasoPolicy } from '../../../core/services/policy.service';

@Component({
  selector: 'app-func-tramite-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './func-tramite-detalle.component.html',
  styleUrl: './func-tramite-detalle.component.scss'
})
export class FuncTramiteDetalleComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private api     = inject(TramitesApiService);
  private formSvc = inject(FormularioService);
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);

  tramite         = signal<Tramite | null>(null);
  actividades     = signal<Actividad[]>([]);
  politicaPasos   = signal<PasoPolicy[]>([]);
  politicaPlantilla  = signal<FormularioPlantilla | null>(null);
  loadingPlantilla   = signal(false);
  formValues         = signal<Record<string, unknown>>({});
  submittingForm     = signal(false);
  formSuccess        = signal('');
  formError          = signal('');
  loading         = signal(true);
  error           = signal('');

  cambiandoEstado = signal(false);
  estadoMsg       = signal('');
  estadoError     = signal('');

  documentos      = signal<Documento[]>([]);
  selectedFile    = signal<File | null>(null);
  uploading       = signal(false);
  docError        = signal('');
  docSuccess      = signal('');

  get id(): string { return this.route.snapshot.paramMap.get('id') ?? ''; }

  ngOnInit(): void {
    this.api.getTramiteById(this.id).subscribe({
      next: t => {
        this.tramite.set(t);
        if (t.datos) this.formValues.set({ ...t.datos });
        this.loadActividades();
        this.loadDocumentos();
        if (t.politicaId) this.loadPoliticaPlantilla(t.politicaId);
      },
      error: () => { this.error.set('No se pudo cargar el trámite.'); this.loading.set(false); }
    });
  }

  private loadPoliticaPlantilla(politicaId: string): void {
    this.loadingPlantilla.set(true);
    this.formSvc.getByPoliticaId(politicaId).subscribe({
      next:  p => { this.politicaPlantilla.set(p); this.loadingPlantilla.set(false); },
      error: () => { this.loadingPlantilla.set(false); }
    });
  }

  onCampoChange(campoId: string, value: unknown): void {
    this.formValues.update(v => ({ ...v, [campoId]: value }));
  }

  submitFormData(): void {
    this.submittingForm.set(true);
    this.formSuccess.set('');
    this.formError.set('');
    this.api.updateTramiteDatos(this.id, this.formValues()).subscribe({
      next: t => {
        this.tramite.set(t);
        this.submittingForm.set(false);
        this.formSuccess.set('Datos guardados correctamente.');
        setTimeout(() => this.formSuccess.set(''), 3000);
      },
      error: () => {
        this.submittingForm.set(false);
        this.formError.set('Error al guardar los datos.');
      }
    });
  }

  campoIcon(tipo: TipoCampo): string {
    const m: Record<string, string> = {
      TEXT: 'text_fields', TEXTAREA: 'notes', NUMBER: 'pin', DATE: 'calendar_today',
      CHECKLIST: 'checklist', SELECTOR: 'list', RADIO: 'radio_button_checked', GRID: 'table_chart',
    };
    return m[tipo] ?? 'input';
  }

  private loadActividades(): void {
    this.api.getActividades(this.id).subscribe({
      next: a => {
        this.actividades.set(a);
        this.loading.set(false);
        if (a.length === 0) {
          const politicaId = this.tramite()?.politicaId;
          if (politicaId) this.loadPoliticaPasos(politicaId);
        }
      },
      error: () => { this.loading.set(false); }
    });
  }

  private loadPoliticaPasos(politicaId: string): void {
    this.api.getPoliticaById(politicaId).subscribe({
      next: (p: any) => {
        if (p.pasos?.length) {
          this.politicaPasos.set(p.pasos as PasoPolicy[]);
        } else if (p.diagramJson) {
          try {
            const diagram = JSON.parse(p.diagramJson);
            const acts: PasoPolicy[] = (diagram.nodes ?? [])
              .filter((n: any) => n.type === 'activity')
              .sort((a: any, b: any) => a.x - b.x)
              .map((n: any, i: number) => ({
                orden: i + 1,
                nombre: n.label || `Paso ${i + 1}`,
                descripcion: '',
                formulario: n.campos ?? []
              }));
            this.politicaPasos.set(acts);
          } catch { /* ignore */ }
        }
      },
      error: () => {}
    });
  }

  private loadDocumentos(): void {
    this.api.getDocumentos(this.id).subscribe({
      next:  d => this.documentos.set(d),
      error: () => {}
    });
  }

  cambiarEstado(estado: TramiteEstado): void {
    if (this.cambiandoEstado()) return;
    this.cambiandoEstado.set(true);
    this.estadoMsg.set('');
    this.estadoError.set('');
    this.api.cambiarEstadoTramite(this.id, estado).subscribe({
      next: t => {
        this.tramite.set(t);
        this.cambiandoEstado.set(false);
        this.estadoMsg.set(`Estado cambiado a ${estado}.`);
        setTimeout(() => this.estadoMsg.set(''), 3000);
      },
      error: () => {
        this.cambiandoEstado.set(false);
        this.estadoError.set('Error al cambiar el estado.');
        setTimeout(() => this.estadoError.set(''), 3000);
      }
    });
  }

  triggerFile(): void { this.fileInputRef?.nativeElement.click(); }

  onFileSelected(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (f) this.selectedFile.set(f);
  }

  uploadDoc(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.docError.set('');
    this.api.uploadDocumento(file, this.id).subscribe({
      next: d => {
        this.documentos.update(list => [d, ...list]);
        this.selectedFile.set(null);
        this.uploading.set(false);
        this.docSuccess.set('Documento subido.');
        setTimeout(() => this.docSuccess.set(''), 3000);
      },
      error: () => {
        this.uploading.set(false);
        this.docError.set('Error al subir el documento.');
      }
    });
  }

  downloadDoc(doc: Documento): void {
    const a = document.createElement('a');
    a.href = doc.url; a.download = doc.nombre; a.target = '_blank'; a.click();
  }

  openActividad(actId: string): void {
    this.router.navigate(['/funcionario/actividades/detalle', actId]);
  }

  goBack(): void { this.router.navigate(['/funcionario/dashboard']); }

  typeIcon(tipo?: string): string {
    if (!tipo) return 'article';
    if (tipo.includes('pdf'))   return 'picture_as_pdf';
    if (tipo.includes('image')) return 'image';
    if (tipo.includes('sheet') || tipo.includes('excel')) return 'table_chart';
    if (tipo.includes('word')  || tipo.includes('document')) return 'description';
    return 'article';
  }

  formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

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
