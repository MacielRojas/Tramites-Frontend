import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Documento } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {
  private http = inject(HttpClient);
  private base = '/api/documentos';

  listarTodos(): Observable<Documento[]> {
    return this.http.get<Documento[]>(this.base);
  }

  getDocumentosPorTramite(tramiteId: string): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.base}/tramite/${tramiteId}`);
  }

  getDocumentoDetails(id: string): Observable<Documento> {
    return this.http.get<Documento>(`${this.base}/${id}`);
  }

  subirDocumento(file: File, tramiteId?: string, politicaId?: string, actividadId?: string): Observable<Documento> {
    const fd = new FormData();
    fd.append('file', file);
    if (tramiteId) fd.append('tramiteId', tramiteId);
    if (politicaId) fd.append('politicaId', politicaId);
    if (actividadId) fd.append('actividadId', actividadId);
    return this.http.post<Documento>(`${this.base}/upload`, fd);
  }

  downloadDocumento(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/download`, { responseType: 'blob' });
  }

  downloadDocumentoVersion(id: string, versionId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/versions/${versionId}/download`, { responseType: 'blob' });
  }

  subirNuevaVersion(id: string, file: File | Blob, comentario: string = '', nombreArchivo = 'documento.docx'): Observable<Documento> {
    const fd = new FormData();
    // Convert Blob to File if needed
    const fileToUpload = file instanceof File ? file : new File([file], nombreArchivo, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fd.append('file', fileToUpload);
    fd.append('comentario', comentario);
    return this.http.post<Documento>(`${this.base}/${id}/upload-version`, fd);
  }

  restaurarVersion(id: string, versionId: string): Observable<Documento> {
    return this.http.post<Documento>(`${this.base}/${id}/restore/${versionId}`, {});
  }

  eliminarDocumento(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  getPermiso(id: string): Observable<{ permiso: 'edit' | 'view' }> {
    return this.http.get<{ permiso: 'edit' | 'view' }>(`${this.base}/${id}/permiso`);
  }
}
