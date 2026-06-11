import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Tramite, Actividad, Comentario, Documento,
  PerfilUpdate, PasswordUpdate
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class TramitesApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // ── Trámites (Funcionario) ────────────────────────────
  getTramitesAsignados(): Observable<Tramite[]> {
    return this.http.get<Tramite[]>(`${this.base}/tramites/asignados`);
  }

  // ── Trámites (Cliente) ────────────────────────────────
  getMisTramites(): Observable<Tramite[]> {
    return this.http.get<Tramite[]>(`${this.base}/tramites/mis-tramites`);
  }

  // ── Trámites (Shared) ─────────────────────────────────
  getTramiteById(id: string): Observable<Tramite> {
    return this.http.get<Tramite>(`${this.base}/tramites/${id}`);
  }

  createTramite(data: Partial<Tramite>): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/tramites`, data);
  }

  // ── Actividades ───────────────────────────────────────
  getActividades(tramiteId: string): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.base}/tramites/${tramiteId}/actividades`);
  }

  getActividadById(id: string): Observable<Actividad> {
    return this.http.get<Actividad>(`${this.base}/actividades/${id}`);
  }

  iniciarActividad(id: string): Observable<Actividad> {
    return this.http.patch<Actividad>(`${this.base}/actividades/${id}/iniciar`, {});
  }

  completarActividad(id: string): Observable<Actividad> {
    return this.http.patch<Actividad>(`${this.base}/actividades/${id}/completar`, {});
  }

  omitirActividad(id: string): Observable<Actividad> {
    return this.http.patch<Actividad>(`${this.base}/actividades/${id}/omitir`, {});
  }

  agregarComentario(actividadId: string, texto: string): Observable<Comentario> {
    return this.http.post<Comentario>(
      `${this.base}/actividades/${actividadId}/comentarios`,
      { texto }
    );
  }

  // ── Documentos ────────────────────────────────────────
  getDocumentos(tramiteId: string): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.base}/tramites/${tramiteId}/documentos`);
  }

  uploadDocumento(tramiteId: string, file: File, nombre: string): Observable<Documento> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('nombre', nombre);
    return this.http.post<Documento>(`${this.base}/tramites/${tramiteId}/documentos`, fd);
  }

  // ── Perfil ────────────────────────────────────────────
  updatePerfil(data: PerfilUpdate): Observable<any> {
    return this.http.put<any>(`${this.base}/usuarios/perfil`, data);
  }

  changePassword(data: PasswordUpdate): Observable<any> {
    return this.http.put<any>(`${this.base}/usuarios/perfil/password`, data);
  }
}
