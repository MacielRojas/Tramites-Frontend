import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { Documento } from '../../../core/models/api.models';

@Component({
  selector: 'app-func-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './func-documentos.component.html',
  styleUrl: './func-documentos.component.scss'
})
export class FuncDocumentosComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private api   = inject(TramitesApiService);
  private route = inject(ActivatedRoute);

  get tramiteId(): string { return this.route.snapshot.queryParamMap.get('tramiteId') ?? ''; }

  documentos    = signal<Documento[]>([]);
  loading       = signal(false);
  uploading     = signal(false);
  error         = signal('');
  success       = signal('');
  showUpload    = signal(false);
  selectedFile  = signal<File | null>(null);
  activeTramite = signal('');

  ngOnInit(): void {
    const tid = this.tramiteId;
    if (tid) { this.activeTramite.set(tid); this.loadDocs(tid); }
  }

  loadDocs(tramiteId: string): void {
    this.activeTramite.set(tramiteId);
    this.loading.set(true); this.error.set('');
    this.api.getDocumentos(tramiteId).subscribe({
      next:  d => { this.documentos.set(d); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los documentos.'); this.loading.set(false); }
    });
  }

  triggerFile(): void { this.fileInputRef.nativeElement.click(); }

  onFileSelected(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.selectedFile.set(f);
    this.showUpload.set(true);
  }

  submitUpload(): void {
    const file = this.selectedFile();
    if (!file || !this.activeTramite()) return;
    this.uploading.set(true); this.error.set('');
    this.api.uploadDocumento(file, this.activeTramite()).subscribe({
      next: d => {
        this.documentos.update(list => [d, ...list]);
        this.showUpload.set(false);
        this.selectedFile.set(null);
        this.uploading.set(false);
        this.success.set('Documento subido correctamente.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: () => { this.error.set('Error al subir el documento.'); this.uploading.set(false); }
    });
  }

  downloadDoc(doc: Documento): void {
    const a = document.createElement('a');
    a.href = doc.url; a.download = doc.nombre; a.target = '_blank'; a.click();
  }

  formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  typeIcon(tipo?: string): string {
    if (!tipo) return 'article';
    if (tipo.includes('pdf'))   return 'picture_as_pdf';
    if (tipo.includes('image')) return 'image';
    if (tipo.includes('sheet') || tipo.includes('excel')) return 'table_chart';
    if (tipo.includes('word') || tipo.includes('document')) return 'description';
    return 'article';
  }
}
