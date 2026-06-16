export type TramiteEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO' | 'CANCELADO';
export type ActividadEstado = 'BLOQUEADO' | 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'OMITIDO';

export interface Tramite {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: TramiteEstado;
  politicaId?: string;
  usuarioSolicitanteId?: string;
  usuarioAsignadoId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaActualizacion?: string;
  datos?: Record<string, unknown>;
}

export interface Actividad {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: ActividadEstado;
  orden: number;
  tramiteId: string;
  responsableId?: string;
  completadoPorNombre?: string;
  rolRequerido?: string;
  nombreDepartamento?: string;
  fechaInicio?: string;
  fechaFin?: string;
  comentarios?: Comentario[];
  formularioPlantillaId?: string;
  respuestaFormularioId?: string;
}

export interface Comentario {
  autorId: string;
  contenido: string;
  fecha: string;
}

export interface Documento {
  id: string;
  nombre: string;
  url: string;
  tipo?: string;
  size?: number;
  subidoPor?: string;
  tramiteId?: string;
  fechaSubida?: string;
}

export interface Politica {
  id: string;
  nombre: string;
  descripcion?: string;
  activa?: boolean;
}

export interface PerfilUpdate {
  email?: string;
}

export interface PasswordUpdate {
  newPassword: string;
  currentPassword?: string;
}

// ── Formularios dinámicos ───────────────────────────────────────────────────

export type TipoCampo = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE'
                      | 'CHECKLIST' | 'SELECTOR' | 'RADIO' | 'GRID';

export interface ColumnaDef {
  key: string;
  label: string;
  tipo: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECTOR';
  opciones?: string[];
}

export interface CampoFormulario {
  id: string;
  tipo: TipoCampo;
  etiqueta: string;
  placeholder?: string;
  requerido: boolean;
  orden: number;
  opciones?: string[];
  columnas?: ColumnaDef[];
}

export interface FormularioPlantilla {
  id?: string;
  nombre: string;
  descripcion?: string;
  politicaId?: string;
  nombrePolitica?: string;
  campos: CampoFormulario[];
  creadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface RespuestaFormulario {
  id?: string;
  formularioPlantillaId: string;
  tramiteId: string;
  actividadId: string;
  respondioPorId?: string;
  respondioPorNombre?: string;
  valores: Record<string, unknown>;
  fechaRespuesta?: string;
}
