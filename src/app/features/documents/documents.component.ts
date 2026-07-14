import { Component, signal, ViewChild, ElementRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentosService } from '../../core/services/documentos.service';
import { AuthService } from '../../core/services/auth.service';
import { Documento } from '../../core/models/api.models';
import { DocumentViewerComponent } from './viewer/document-viewer.component';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentViewerComponent],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private documentosService = inject(DocumentosService);
  private authService = inject(AuthService);

  viewMode = signal<'grid' | 'list'>('list');
  filesList = signal<Documento[]>([]);
  loading = signal(true);

  // Categorías estáticas para decoración de la vista
  categories = [
    { id: 'facturas',         label: 'Facturas',         count: 248, size: '1.2 GB', icon: 'receipt_long', color: '#5d6237' },
    { id: 'contratos',        label: 'Contratos',        count: 52,  size: '450 MB', icon: 'description',  color: '#c4748a' },
    { id: 'identificaciones', label: 'Identificaciones', count: 12,  size: '24 MB',  icon: 'badge',        color: '#5d5f5f' },
    { id: 'otros',            label: 'Otros',            count: 89,  size: '2.4 GB', icon: 'folder',       color: '#8b4b5a' },
  ];

  // Modal y visor
  showUploadModal  = signal(false);
  showDeleteConfirm = signal<string | null>(null);
  selectedDocumentoId = signal<string | null>(null);

  uploadForm = { name: '', category: 'Contratos', selectedFile: null as File | null };

  ngOnInit(): void {
    this.cargarLista();
  }

  cargarLista(): void {
    this.loading.set(true);
    this.documentosService.listarTodos().subscribe({
      next: (docs) => {
        this.filesList.set(docs || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al listar documentos:', err);
        this.loading.set(false);
      }
    });
  }

  // ── Upload ───────────────────────────────────────────

  triggerUpload(): void {
    this.uploadForm = { name: '', category: 'Contratos', selectedFile: null };
    this.showUploadModal.set(true);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadForm.selectedFile = file;
    this.uploadForm.name = file.name;
  }

  submitUpload(): void {
    if (!this.uploadForm.selectedFile || !this.uploadForm.name.trim()) return;
    
    this.loading.set(true);
    this.documentosService.subirDocumento(this.uploadForm.selectedFile).subscribe({
      next: (doc) => {
        this.showUploadModal.set(false);
        this.cargarLista();
      },
      error: (err) => {
        console.error('Error al subir documento:', err);
        this.loading.set(false);
      }
    });
  }

  // ── Download ─────────────────────────────────────────

  downloadFile(file: Documento): void {
    this.documentosService.downloadDocumento(file.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.nombre;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error descargando archivo:', err)
    });
  }

  // ── Visor Inline ─────────────────────────────────────

  openViewer(file: Documento): void {
    this.selectedDocumentoId.set(file.id);
  }

  // ── Delete ───────────────────────────────────────────

  askDelete(id: string): void  { this.showDeleteConfirm.set(id); }
  cancelDelete(): void          { this.showDeleteConfirm.set(null); }

  confirmDelete(): void {
    const id = this.showDeleteConfirm();
    if (!id) return;

    this.loading.set(true);
    this.documentosService.eliminarDocumento(id).subscribe({
      next: () => {
        this.showDeleteConfirm.set(null);
        this.cargarLista();
      },
      error: (err) => {
        console.error('Error eliminando documento:', err);
        this.loading.set(false);
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────

  formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fileToDelete(id: string | null): Documento | undefined {
    return id ? this.filesList().find(f => f.id === id) : undefined;
  }

  esDocx(file: Documento): boolean {
    const ext = file.nombre.split('.').pop()?.toLowerCase();
    return ext === 'docx' || ext === 'doc';
  }

  getIcon(file: Documento): string {
    const ext = file.nombre.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'picture_as_pdf';
    if (['jpg','jpeg','png','gif','svg'].includes(ext || '')) return 'image';
    if (ext === 'docx' || ext === 'doc') return 'description';
    return 'draft';
  }

  getIconColor(file: Documento): string {
    const ext = file.nombre.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '#c4748a';
    if (['jpg','jpeg','png'].includes(ext || '')) return '#2e7d8c';
    if (ext === 'docx' || ext === 'doc') return '#4a7c59';
    return '#8b4b5a';
  }
}
