import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DocFile {
  id: string;
  name: string;
  category: string;
  owner: string;
  ownerInitials: string;
  ownerColor: string;
  modified: string;
  size: string;
  icon: string;
  iconColor: string;
  url?: string;
}

const COLORS = ['#8b4b5a','#5d6237','#2e7d8c','#c4748a','#7b5ea7','#4a7c59'];

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  viewMode = signal<'grid' | 'list'>('list');

  categories = [
    { id: 'facturas',         label: 'Facturas',         count: 248, size: '1.2 GB', icon: 'receipt_long', color: '#5d6237' },
    { id: 'contratos',        label: 'Contratos',        count: 52,  size: '450 MB', icon: 'description',  color: '#c4748a' },
    { id: 'identificaciones', label: 'Identificaciones', count: 12,  size: '24 MB',  icon: 'badge',        color: '#5d5f5f' },
    { id: 'otros',            label: 'Otros',            count: 89,  size: '2.4 GB', icon: 'folder',       color: '#8b4b5a' },
  ];

  filesList = signal<DocFile[]>([
    { id: '1', name: 'Contrato_Alquiler_2024.pdf',  category: 'Contratos',       owner: 'Juan Díaz',    ownerInitials: 'JD', ownerColor: '#c4748a', modified: 'Hace 2 horas', size: '4.2 MB',  icon: 'picture_as_pdf', iconColor: '#c4748a' },
    { id: '2', name: 'Factura_Servicios_May.docx',  category: 'Facturas',        owner: 'Marta Miró',   ownerInitials: 'MM', ownerColor: '#5d6237', modified: 'Ayer, 15:30',  size: '850 KB',  icon: 'article',        iconColor: '#5d6237' },
    { id: '3', name: 'DNI_Titular_Front.jpg',       category: 'Identificaciones',owner: 'Ricardo Soler',ownerInitials: 'RS', ownerColor: '#8b4b5a', modified: '25 May 2024',  size: '2.1 MB',  icon: 'image',          iconColor: '#5d5f5f' },
    { id: '4', name: 'Contrato_Servicios_2024.pdf', category: 'Contratos',       owner: 'Ana Pérez',    ownerInitials: 'AP', ownerColor: '#7b5ea7', modified: '22 May 2024',  size: '1.8 MB',  icon: 'picture_as_pdf', iconColor: '#c4748a' },
    { id: '5', name: 'Factura_Abril_2024.pdf',      category: 'Facturas',        owner: 'Luis Torres',  ownerInitials: 'LT', ownerColor: '#2e7d8c', modified: '18 May 2024',  size: '320 KB',  icon: 'picture_as_pdf', iconColor: '#c4748a' },
  ]);

  // Modal state
  showUploadModal  = signal(false);
  showEditModal    = signal(false);
  showShareModal   = signal(false);
  showDeleteConfirm = signal<string | null>(null);
  shareCopied      = signal(false);
  selectedFile     = signal<DocFile | null>(null);
  private nextId   = 100;

  uploadForm = { name: '', category: 'Contratos', owner: '', size: '', selectedFile: null as File | null };
  editForm: Partial<DocFile> = {};

  readonly categoryOptions = ['Facturas', 'Contratos', 'Identificaciones', 'Otros'];

  // ── Upload ───────────────────────────────────────────

  triggerUpload(): void {
    this.uploadForm = { name: '', category: 'Contratos', owner: '', size: '', selectedFile: null };
    this.showUploadModal.set(true);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadForm.selectedFile = file;
    this.uploadForm.name = file.name;
    this.uploadForm.size = this.formatBytes(file.size);
  }

  submitUpload(): void {
    if (!this.uploadForm.name.trim()) return;
    const initials = (this.uploadForm.owner || 'Yo').trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'YO';
    const color = COLORS[this.nextId % COLORS.length];
    const ext = this.uploadForm.name.split('.').pop()?.toLowerCase() ?? '';
    const icon = ext === 'pdf' ? 'picture_as_pdf' : ['jpg','jpeg','png','gif'].includes(ext) ? 'image' : 'article';
    const iconColor = ext === 'pdf' ? '#c4748a' : ['jpg','jpeg','png'].includes(ext) ? '#5d5f5f' : '#5d6237';
    const url = this.uploadForm.selectedFile ? URL.createObjectURL(this.uploadForm.selectedFile) : undefined;

    const f: DocFile = {
      id:           `${this.nextId++}`,
      name:         this.uploadForm.name,
      category:     this.uploadForm.category,
      owner:        this.uploadForm.owner || 'Yo',
      ownerInitials: initials,
      ownerColor:   color,
      modified:     'Ahora mismo',
      size:         this.uploadForm.size || '—',
      icon, iconColor, url,
    };
    this.filesList.update(list => [f, ...list]);
    this.showUploadModal.set(false);
  }

  // ── Download ─────────────────────────────────────────

  downloadFile(file: DocFile): void {
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url; a.download = file.name; a.click();
    } else {
      // Simulated download: create a placeholder text blob
      const blob = new Blob([`Archivo: ${file.name}\nCategoría: ${file.category}\nPropietario: ${file.owner}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
    }
  }

  // ── Share ────────────────────────────────────────────

  openShare(file: DocFile): void {
    this.selectedFile.set(file);
    this.shareCopied.set(false);
    this.showShareModal.set(true);
  }

  copyShareLink(): void {
    const link = `https://tramiteflow.app/doc/${this.selectedFile()?.id}`;
    navigator.clipboard.writeText(link).catch(() => {});
    this.shareCopied.set(true);
    setTimeout(() => this.shareCopied.set(false), 2000);
  }

  // ── Edit ─────────────────────────────────────────────

  openEdit(file: DocFile): void {
    this.editForm = { ...file };
    this.selectedFile.set(file);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (!this.editForm.name?.trim()) return;
    this.filesList.update(list =>
      list.map(f => f.id === this.editForm.id ? { ...f, ...this.editForm, modified: 'Ahora mismo' } as DocFile : f)
    );
    this.showEditModal.set(false);
  }

  // ── Delete ───────────────────────────────────────────

  askDelete(id: string): void  { this.showDeleteConfirm.set(id); }
  cancelDelete(): void          { this.showDeleteConfirm.set(null); }

  confirmDelete(): void {
    const id = this.showDeleteConfirm();
    if (id) this.filesList.update(list => list.filter(f => f.id !== id));
    this.showDeleteConfirm.set(null);
  }

  // ── Helpers ──────────────────────────────────────────

  private formatBytes(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fileToDelete(id: string | null): DocFile | undefined {
    return id ? this.filesList().find(f => f.id === id) : undefined;
  }
}
