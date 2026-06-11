export type TramiteEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO' | 'CANCELADO';
export type ActividadEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'OMITIDA';

export interface Tramite {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: TramiteEstado;
  tipoTramite?: string;
  clienteNombre?: string;
  clienteId?: string;
  funcionarioNombre?: string;
  funcionarioId?: string;
  prioridad?: 'ALTA' | 'MEDIA' | 'BAJA';
  fechaCreacion: string;
  fechaActualizacion?: string;
}

export interface Actividad {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: ActividadEstado;
  orden: number;
  tramiteId: string;
  responsable?: string;
  fechaInicio?: string;
  fechaFin?: string;
  comentarios?: Comentario[];
}

export interface Comentario {
  id: string;
  texto: string;
  autor: string;
  fecha: string;
}

export interface Documento {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  tamano: string;
  fechaSubida: string;
  subidoPor: string;
}

export interface PerfilUpdate {
  username?: string;
  email?: string;
  fullName?: string;
  phone?: string;
}

export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
}
