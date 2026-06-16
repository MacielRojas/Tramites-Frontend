import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { FormularioService } from '../../../core/services/formulario.service';
import {
  Tramite, Actividad, ActividadEstado, FormularioPlantilla,
  RespuestaFormulario, Documento, TipoCampo
} from '../../../core/models/api.models';
import { FormRendererComponent } from '../../../shared/components/form-renderer/form-renderer.component';

@Component({
  selector: 'app-cli-tramite-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, FormRendererComponent],
  templateUrl: './cli-tramite-detalle.component.html',
  styleUrl: './cli-tramite-detalle.component.scss'
})
export class CliTramiteDetalleComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

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

  politicaPlantilla  = signal<FormularioPlantilla | null>(null);
  loadingPlantilla   = signal(false);

  documentos    = signal<Documento[]>([]);
  selectedFile  = signal<File | null>(null);
  uploading     = signal(false);
  docError      = signal('');
  docSuccess    = signal('');

  formValues      = signal<Record<string, unknown>>({});
  submittingForm  = signal(false);
  formSuccess     = signal('');
  formError       = signal('');

  get id(): string { return this.route.snapshot.paramMap.get('id') ?? ''; }

  ngOnInit(): void {
    this.api.getTramiteById(this.id).subscribe({
      next: t => {
        this.tramite.set(t);
        if (t.datos) this.formValues.set({ ...t.datos });
        this.api.getActividades(this.id).subscribe({
          next: a => {
            this.actividades.set(a);
            this.loading.set(false);
            this.loadFormularios(a);
          },
          error: () => { this.loading.set(false); }
        });
        this.loadDocumentos();
        if (t.politicaId) { this.loadPoliticaPlantilla(t.politicaId); }
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

  private loadPoliticaPlantilla(politicaId: string): void {
    this.loadingPlantilla.set(true);
    this.formSvc.getByPoliticaId(politicaId).subscribe({
      next:  p => { this.politicaPlantilla.set(p); this.loadingPlantilla.set(false); },
      error: () => { this.loadingPlantilla.set(false); }
    });
  }

  private loadDocumentos(): void {
    this.api.getDocumentos(this.id).subscribe({
      next:  d => this.documentos.set(d),
      error: () => {}
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
        this.docSuccess.set('Documento adjuntado correctamente.');
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

  campoIcon(tipo: TipoCampo): string {
    const m: Record<string, string> = {
      TEXT: 'text_fields', TEXTAREA: 'notes', NUMBER: 'pin', DATE: 'calendar_today',
      CHECKLIST: 'checklist', SELECTOR: 'list', RADIO: 'radio_button_checked', GRID: 'table_chart',
    };
    return m[tipo] ?? 'input';
  }

  getRespuestaParaActividad(actId: string): RespuestaFormulario | undefined {
    return this.respuestas().find(r => r.actividadId === actId);
  }

  getPlantillaParaActividad(a: Actividad): FormularioPlantilla | undefined {
    if (!a.formularioPlantillaId) return undefined;
    return this.plantillas().get(a.formularioPlantillaId);
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
