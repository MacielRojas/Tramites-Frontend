import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Policy {
  id?: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  diagramJson?: string;
  creadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  pasos?: unknown[];
}

@Injectable({ providedIn: 'root' })
export class PolicyService {
  private http = inject(HttpClient);
  private base = '/api/politicas';

  getAll(): Observable<Policy[]> {
    return this.http.get<Policy[]>(this.base);
  }

  getById(id: string): Observable<Policy> {
    return this.http.get<Policy>(`${this.base}/${id}`);
  }

  create(data: Partial<Policy>): Observable<Policy> {
    return this.http.post<Policy>(this.base, data);
  }

  update(id: string, data: Policy): Observable<Policy> {
    return this.http.put<Policy>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  activate(id: string): Observable<Policy> {
    return this.http.patch<Policy>(`${this.base}/${id}/activar`, {});
  }

  deactivate(id: string): Observable<Policy> {
    return this.http.patch<Policy>(`${this.base}/${id}/desactivar`, {});
  }
}
