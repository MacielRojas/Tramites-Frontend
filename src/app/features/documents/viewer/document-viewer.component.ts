import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { DocumentEditorContainerComponent, DocumentEditorContainerAllModule } from '@syncfusion/ej2-angular-documenteditor';
import { Documento, DocumentoVersion } from '../../../core/models/api.models';
import { DocumentosService } from '../../../core/services/documentos.service';
import { DocumentoSocketService } from '../../../core/services/documento-socket.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, DocumentEditorContainerAllModule],
  templateUrl: './document-viewer.component.html',
  styleUrl: './document-viewer.component.scss'
})
export class DocumentViewerComponent implements OnInit, OnDestroy {
  @Input() documentoId!: string;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('documenteditor') documentEditorContainer!: DocumentEditorContainerComponent;

  private documentosService = inject(DocumentosService);
  private documentoSocketService = inject(DocumentoSocketService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);

  documento: Documento | null = null;
  permiso = signal<'edit' | 'view'>('view');
  loading = signal(true);
  saving = signal(false);
  colaboradores = signal<string[]>([]);
  statusTexto = signal<string>('');
  pdfUrl: SafeResourceUrl | null = null;
  private currentPdfObjectUrl: string | null = null;

  get username(): string {
    return this.authService.getCurrentUser()?.username || 'Usuario';
  }

  ngOnInit(): void {
    this.cargarDetalle();
  }

  ngOnDestroy(): void {
    this.documentoSocketService.desconectar(this.documentoId, this.username);
    this.limpiarPdfUrl();
  }

  private limpiarPdfUrl(): void {
    if (this.currentPdfObjectUrl) {
      URL.revokeObjectURL(this.currentPdfObjectUrl);
      this.currentPdfObjectUrl = null;
    }
  }

  cargarDetalle(): void {
    this.loading.set(true);
    this.documentosService.getDocumentoDetails(this.documentoId).subscribe({
      next: (doc) => {
        this.documento = doc;
        
        // 1. Obtener permisos dinámicos según el rol y workflow
        this.documentosService.getPermiso(this.documentoId).subscribe({
          next: (res) => {
            this.permiso.set(res.permiso);
            
            // 2. Conectar WebSocket para colaboración en tiempo real
            this.conectarColaboracion();

            // 3. Renderizar visor según el tipo
            if (this.esDocx()) {
              this.cargarDocumentoEnEditor();
            } else if (this.esPdf()) {
              this.cargarPdfBinario();
            } else {
              this.loading.set(false);
            }
          },
          error: (err) => {
            console.error('Error al obtener permisos:', err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error al cargar detalles del documento:', err);
        this.loading.set(false);
      }
    });
  }

  cargarPdfBinario(): void {
    this.limpiarPdfUrl();
    this.documentosService.downloadDocumento(this.documentoId).subscribe({
      next: (blob: Blob) => {
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        this.currentPdfObjectUrl = URL.createObjectURL(pdfBlob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentPdfObjectUrl);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al descargar el binario PDF:', err);
        this.loading.set(false);
      }
    });
  }

  conectarColaboracion(): void {
    this.documentoSocketService.conectar(this.documentoId, this.username).subscribe({
      next: (msg) => {
        if (msg.tipo === 'USUARIO_UNIDO' || msg.tipo === 'USUARIO_SALIO') {
          this.colaboradores.set(msg.colaboradores || []);
        } else if (msg.tipo === 'OPERACION_EDICION') {
          if (msg.autor !== this.username) {
            this.statusTexto.set(`${msg.autor} está realizando modificaciones...`);
            setTimeout(() => this.statusTexto.set(''), 3000);
          }
        } else if (msg.tipo === 'DOCUMENTO_GUARDADO') {
          if (msg.autor !== this.username) {
            this.statusTexto.set(`El usuario ${msg.autor} guardó la versión v${msg.version}. Recargando contenido...`);
            this.recargarDocumento();
          }
        }
      }
    });
  }

  onEditorCreated(): void {
    if (this.documento && this.esDocx()) {
      this.cargarDocumentoEnEditor();
    }
  }

  cargarDocumentoEnEditor(): void {
    if (!this.documentoId) return;

    this.documentosService.downloadDocumento(this.documentoId).subscribe({
      next: (blob: Blob) => {
        const formData = new FormData();
        formData.append('files', blob, this.documento?.nombre || 'documento.docx');

        // Convertir DOCX a formato SFDT que entiende Syncfusion
        this.http.post('https://ej2services.syncfusion.com/production/web-services/api/documenteditor/Import', formData, { responseType: 'text' }).subscribe({
          next: (sfdt: string) => {
            this.inyectarSfdtEnEditor(sfdt);
          },
          error: (err) => {
            console.error('Error al convertir DOCX a SFDT:', err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error descargando binario en Syncfusion:', err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Asegura que Syncfusion haya renderizado el componente antes de abrir el texto SFDT
   */
  private inyectarSfdtEnEditor(sfdt: string, intentos = 0): void {
    if (this.documentEditorContainer && this.documentEditorContainer.documentEditor) {
      try {
        this.documentEditorContainer.documentEditor.open(sfdt);
        this.documentEditorContainer.documentEditor.isReadOnly = (this.permiso() === 'view');
      } catch (e) {
        console.warn('Error al abrir SFDT en el editor, reintentando...', e);
      } finally {
        this.loading.set(false);
      }
    } else if (intentos < 10) {
      // Reintentar si el componente Angular no ha montado completamente el objeto nativo
      setTimeout(() => this.inyectarSfdtEnEditor(sfdt, intentos + 1), 150);
    } else {
      console.error('No se pudo instanciar el Editor de Syncfusion.');
      this.loading.set(false);
    }
  }

  recargarDocumento(): void {
    this.loading.set(true);
    this.documentosService.getDocumentoDetails(this.documentoId).subscribe({
      next: (doc) => {
        this.documento = doc;
        if (this.esDocx()) {
          this.cargarDocumentoEnEditor();
        } else if (this.esPdf()) {
          this.cargarPdfBinario();
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  get versionesOrdenadas(): DocumentoVersion[] {
    if (!this.documento || !this.documento.versiones) return [];
    return [...this.documento.versiones].sort((a, b) => b.version - a.version);
  }

  guardarVersion(): void {
    if (!this.documentEditorContainer || this.saving()) return;

    this.saving.set(true);
    this.documentEditorContainer.documentEditor.saveAsBlob('Docx').then((blob: Blob) => {
      const comentario = prompt('Comentario de la nueva versión:', 'Guardado en línea');
      this.documentosService.subirNuevaVersion(this.documentoId, blob, comentario || 'Edición colaborativa', this.documento?.nombre).subscribe({
        next: (updatedDoc) => {
          this.documento = updatedDoc;
          this.saving.set(false);
          
          this.documentoSocketService.enviarOperacion(this.documentoId, this.username, {
            tipo: 'DOCUMENTO_GUARDADO',
            version: updatedDoc.versionActual
          });
        },
        error: (err) => {
          console.error('Error al guardar nueva versión:', err);
          this.saving.set(false);
        }
      });
    });
  }

  onContentChange(): void {
    this.documentoSocketService.enviarOperacion(this.documentoId, this.username, {
      tipo: 'OPERACION_EDICION'
    });
  }

  descargar(): void {
    if (!this.documento) return;
    this.documentosService.downloadDocumento(this.documentoId).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.documento?.nombre || 'documento.docx';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  descargarVersion(v: DocumentoVersion): void {
    if (!this.documento) return;
    this.documentosService.downloadDocumentoVersion(this.documentoId, v.id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `v${v.version}_${this.documento?.nombre}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  restaurarVersion(v: DocumentoVersion): void {
    if (!confirm(`¿Estás seguro de restaurar el documento a la versión ${v.version}?`)) return;

    this.loading.set(true);
    this.documentosService.restaurarVersion(this.documentoId, v.id).subscribe({
      next: (updatedDoc) => {
        this.documento = updatedDoc;
        this.statusTexto.set(`Documento restaurado a la versión v${v.version}`);
        
        this.documentoSocketService.enviarOperacion(this.documentoId, this.username, {
          tipo: 'DOCUMENTO_GUARDADO',
          version: updatedDoc.versionActual
        });

        if (this.esDocx()) {
          this.cargarDocumentoEnEditor();
        } else if (this.esPdf()) {
          this.cargarPdfBinario();
        } else {
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error al restaurar versión:', err);
        this.loading.set(false);
      }
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  esDocx(): boolean {
    const ext = this.documento?.nombre?.split('.').pop()?.toLowerCase();
    return ext === 'docx' || ext === 'doc';
  }

  esPdf(): boolean {
    const ext = this.documento?.nombre?.split('.').pop()?.toLowerCase();
    return ext === 'pdf';
  }

  esImagen(): boolean {
    const ext = this.documento?.nombre?.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '');
  }

  getIcon(): string {
    if (this.esPdf()) return 'picture_as_pdf';
    if (this.esImagen()) return 'image';
    if (this.esDocx()) return 'description';
    return 'draft';
  }

  get iconColor(): string {
    if (this.esPdf()) return '#c4748a';
    if (this.esImagen()) return '#2e7d8c';
    if (this.esDocx()) return '#4a7c59';
    return '#8b4b5a';
  }
}