import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import {
  Tramite, Actividad, Comentario, Documento,
  Politica, PerfilUpdate, PasswordUpdate
} from '../models/api.models';

interface PagedResponse<T> { content: T[]; totalElements: number; }

@Injectable({ providedIn: 'root' })
export class TramitesApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = '/api';

  private get userId(): string { return this.auth.getCurrentUser()?.id ?? ''; }

  // ── Trámites (Funcionario) ────────────────────────────
  getTramitesAsignados(): Observable<Tramite[]> {
    return this.http.get<PagedResponse<Tramite> | Tramite[]>(`${this.base}/tramites/asignados`)
      .pipe(map((r: any) => Array.isArray(r) ? r : (r.content ?? [])));
  }

  getAllTramites(): Observable<Tramite[]> {
    return this.http.get<PagedResponse<Tramite> | Tramite[]>(`${this.base}/tramites`)
      .pipe(map((r: any) => Array.isArray(r) ? r : (r.content ?? [])));
  }

  cambiarEstadoTramite(id: string, estado: string, comentario = ''): Observable<Tramite> {
    return this.http.patch<Tramite>(`${this.base}/tramites/${id}/estado`, { estado, comentario });
  }

  // ── Trámites (Cliente) ────────────────────────────────
  getMisTramites(): Observable<Tramite[]> {
    return this.http.get<PagedResponse<Tramite> | Tramite[]>(`${this.base}/tramites/mis-tramites`)
      .pipe(map((r: any) => Array.isArray(r) ? r : (r.content ?? [])));
  }

  // ── Trámites (Shared) ─────────────────────────────────
  getTramiteById(id: string): Observable<Tramite> {
    return this.http.get<Tramite>(`${this.base}/tramites/${id}`);
  }

  createTramite(politicaId: string, titulo: string, descripcion: string,
                datos: Record<string, unknown> = {}): Observable<Tramite> {
    return this.http.post<Tramite>(`${this.base}/tramites`, {
      titulo, descripcion, politicaId, datos
    });
  }

  updateTramiteDatos(tramiteId: string, datos: Record<string, unknown>): Observable<Tramite> {
    return this.http.patch<Tramite>(`${this.base}/tramites/${tramiteId}/datos`, datos);
  }

  // ── Políticas ─────────────────────────────────────────
  getPoliticas(): Observable<Politica[]> {
    return this.http.get<Politica[]>(`${this.base}/politicas?soloActivas=true`);
  }

  getPoliticaById(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/politicas/${id}`);
  }

  // ── Actividades ───────────────────────────────────────
  getActividades(tramiteId: string): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.base}/actividades/tramite/${tramiteId}`);
  }

  getActividadById(id: string): Observable<Actividad> {
    return this.http.get<Actividad>(`${this.base}/actividades/${id}`);
  }

  iniciarActividad(id: string): Observable<Actividad> {
    return this.http.patch<Actividad>(`${this.base}/actividades/${id}/iniciar`,
      { responsableId: this.userId });
  }

  completarActividad(id: string, comentario: string = ''): Observable<Actividad> {
    return this.http.patch<Actividad>(`${this.base}/actividades/${id}/completar`,
      { comentario, autorId: this.userId });
  }

  omitirActividad(id: string, motivo: string = ''): Observable<Actividad> {
    return this.http.patch<Actividad>(`${this.base}/actividades/${id}/omitir`,
      { motivo, autorId: this.userId });
  }

  agregarComentario(actividadId: string, contenido: string): Observable<Comentario> {
    return this.http.post<Comentario>(`${this.base}/actividades/${actividadId}/comentarios`,
      { autorId: this.userId, contenido });
  }

  // ── Documentos ────────────────────────────────────────
  getDocumentos(tramiteId: string): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.base}/documentos/tramite/${tramiteId}`);
  }

  uploadDocumento(file: File, tramiteId: string): Observable<Documento> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tramiteId', tramiteId);
    return this.http.post<Documento>(`${this.base}/documentos/upload`, fd);
  }

  // ── Perfil ────────────────────────────────────────────
  updatePerfil(data: PerfilUpdate): Observable<any> {
    return this.http.put<any>(`${this.base}/usuarios/me`, { email: data.email });
  }

  changePassword(data: PasswordUpdate): Observable<any> {
    return this.http.patch<any>(`${this.base}/usuarios/me/password`, { nuevaPassword: data.newPassword });
  }
}
