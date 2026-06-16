import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FormularioPlantilla, RespuestaFormulario } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class FormularioService {
  private http = inject(HttpClient);
  private base = '/api/formularios';

  // ── Plantillas ──────────────────────────────────────────────────────────────

  getAll(): Observable<FormularioPlantilla[]> {
    return this.http.get<FormularioPlantilla[]>(this.base);
  }

  getById(id: string): Observable<FormularioPlantilla> {
    return this.http.get<FormularioPlantilla>(`${this.base}/${id}`);
  }

  getByPoliticaId(politicaId: string): Observable<FormularioPlantilla> {
    return this.http.get<FormularioPlantilla>(`${this.base}/politica/${politicaId}`);
  }

  create(data: FormularioPlantilla): Observable<FormularioPlantilla> {
    return this.http.post<FormularioPlantilla>(this.base, data);
  }

  update(id: string, data: FormularioPlantilla): Observable<FormularioPlantilla> {
    return this.http.put<FormularioPlantilla>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Respuestas ──────────────────────────────────────────────────────────────

  submitRespuesta(actividadId: string, valores: Record<string, unknown>): Observable<RespuestaFormulario> {
    return this.http.post<RespuestaFormulario>(`${this.base}/respuestas/${actividadId}`, valores);
  }

  getRespuestaPorActividad(actividadId: string): Observable<RespuestaFormulario> {
    return this.http.get<RespuestaFormulario>(`${this.base}/respuestas/actividad/${actividadId}`);
  }

  getRespuestasPorTramite(tramiteId: string): Observable<RespuestaFormulario[]> {
    return this.http.get<RespuestaFormulario[]>(`${this.base}/respuestas/tramite/${tramiteId}`);
  }
}
