import { Component, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type TramiteStatus = 'En Proceso' | 'Completado' | 'Pendiente';

export interface Tramite {
  id: string;
  name: string;
  subtitle: string;
  clientName: string;
  clientInitials: string;
  clientColor: string;
  status: TramiteStatus;
  date: string;
  description?: string;
  responsible?: string;
  priority?: 'Alta' | 'Media' | 'Baja';
}

const COLORS = ['#8b4b5a', '#5d6237', '#2e7d8c', '#c4748a', '#7b5ea7', '#4a7c59'];

@Component({
  selector: 'app-tramites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tramites.component.html',
  styleUrl: './tramites.component.scss'
})
export class TramitesComponent {
  stats = [
    { label: 'Total Activos', value: '124', icon: 'folder_open', note: '12% más que el mes pasado', notePositive: true },
    { label: 'Pendientes', value: '42', icon: 'pending', note: 'Requiere atención inmediata', notePositive: false },
    { label: 'Completados Hoy', value: '18', icon: 'task_alt', note: 'Tasa de éxito del 89%', notePositive: true },
    { label: 'Tiempo Promedio', value: '4.2d', icon: 'schedule', note: 'Eficiencia mejorada', notePositive: true },
  ];

  tramitesList = signal<Tramite[]>([
    { id: '#TF-9042', name: 'Licencia de Apertura', subtitle: 'Expediente Urbanístico A-22', clientName: 'Elena Alarcón', clientInitials: 'EA', clientColor: '#8b4b5a', status: 'En Proceso', date: '12 Oct 2024', description: 'Trámite para obtener la licencia de apertura de un local comercial en el centro urbano.', responsible: 'Dept. Urbanismo', priority: 'Alta' },
    { id: '#TF-9038', name: 'Renovación Pasaporte', subtitle: 'Trámite Consular Urgente', clientName: 'Ricardo Mendoza', clientInitials: 'RM', clientColor: '#5d6237', status: 'Completado', date: '11 Oct 2024', description: 'Renovación de pasaporte con carácter urgente por viaje internacional inmediato.', responsible: 'Oficina Consular', priority: 'Alta' },
    { id: '#TF-9035', name: 'Visado de Estudios', subtitle: 'Documentación Académica', clientName: 'Sofía Luna', clientInitials: 'SL', clientColor: '#2e7d8c', status: 'Pendiente', date: '10 Oct 2024', description: 'Solicitud de visado de estudios para programa universitario en el extranjero.', responsible: 'Dept. Exterior', priority: 'Media' },
    { id: '#TF-9031', name: 'Alta Seguridad Social', subtitle: 'Régimen Autónomos', clientName: 'Mateo García', clientInitials: 'MG', clientColor: '#c4748a', status: 'En Proceso', date: '09 Oct 2024', description: 'Alta en el sistema de seguridad social como trabajador autónomo, régimen especial.', responsible: 'Dept. Social', priority: 'Media' },
    { id: '#TF-9029', name: 'Certificado de Residencia', subtitle: 'Trámite Municipal', clientName: 'Carla Valdés', clientInitials: 'CV', clientColor: '#7b5ea7', status: 'Completado', date: '08 Oct 2024', description: 'Emisión de certificado oficial de residencia para trámites administrativos.', responsible: 'Ayuntamiento', priority: 'Baja' },
    { id: '#TF-9026', name: 'Permiso de Obras', subtitle: 'Reforma Interior Local', clientName: 'Antonio Ruiz', clientInitials: 'AR', clientColor: '#5d6237', status: 'Pendiente', date: '07 Oct 2024', description: 'Solicitud de permiso municipal para reforma interior de local en zona protegida.', responsible: 'Dept. Urbanismo', priority: 'Alta' },
    { id: '#TF-9023', name: 'Inscripción Registro Civil', subtitle: 'Nacimiento — Prov. Madrid', clientName: 'Laura Moreno', clientInitials: 'LM', clientColor: '#8b4b5a', status: 'Completado', date: '06 Oct 2024', description: 'Inscripción de nacimiento en el Registro Civil de la Provincia de Madrid.', responsible: 'Registro Civil', priority: 'Baja' },
    { id: '#TF-9019', name: 'Licencia Actividad', subtitle: 'Comercio Minorista Sector B', clientName: 'Pedro Ibáñez', clientInitials: 'PI', clientColor: '#2e7d8c', status: 'En Proceso', date: '05 Oct 2024', description: 'Licencia de actividad para apertura de comercio minorista en zona comercial Sector B.', responsible: 'Dept. Comercio', priority: 'Media' },
  ]);

  filterStatus = signal<TramiteStatus | 'Todos'>('Todos');
  showFilter = signal(false);
  showNewModal = signal(false);
  showDetail = signal(false);
  selectedTramite = signal<Tramite | null>(null);
  currentPage = signal(1);
  readonly PAGE_SIZE = 5;
  private nextNum = 9000;

  newForm: Partial<Tramite> & { clientName: string } = {
    name: '', subtitle: '', clientName: '', status: 'Pendiente', description: '', responsible: '', priority: 'Media'
  };

  readonly statusOptions: (TramiteStatus | 'Todos')[] = ['Todos', 'En Proceso', 'Pendiente', 'Completado'];
  readonly priorityOptions: Tramite['priority'][] = ['Alta', 'Media', 'Baja'];

  filteredTramites = computed(() => {
    const s = this.filterStatus();
    return s === 'Todos' ? this.tramitesList() : this.tramitesList().filter(t => t.status === s);
  });

  totalPages = computed(() => Math.ceil(this.filteredTramites().length / this.PAGE_SIZE));
  pagedTramites = computed(() => {
    const start = (this.currentPage() - 1) * this.PAGE_SIZE;
    return this.filteredTramites().slice(start, start + this.PAGE_SIZE);
  });
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  setFilter(s: TramiteStatus | 'Todos'): void {
    this.filterStatus.set(s);
    this.currentPage.set(1);
    this.showFilter.set(false);
  }

  openDetail(t: Tramite): void {
    this.selectedTramite.set(t);
    this.showDetail.set(true);
  }

  openNew(): void {
    this.newForm = { name: '', subtitle: '', clientName: '', status: 'Pendiente', description: '', responsible: '', priority: 'Media' };
    this.showNewModal.set(true);
  }

  submitNew(): void {
    if (!this.newForm.name?.trim() || !this.newForm.clientName?.trim()) return;
    const num = --this.nextNum;
    const initials = this.newForm.clientName.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const t: Tramite = {
      id: `#TF-${num}`,
      name: this.newForm.name!,
      subtitle: this.newForm.subtitle || '',
      clientName: this.newForm.clientName!,
      clientInitials: initials,
      clientColor: color,
      status: this.newForm.status as TramiteStatus || 'Pendiente',
      date: today,
      description: this.newForm.description || '',
      responsible: this.newForm.responsible || '',
      priority: this.newForm.priority || 'Media',
    };
    this.tramitesList.update(list => [t, ...list]);
    this.showNewModal.set(false);
  }

  exportCSV(): void {
    const rows = this.filteredTramites();
    const header = 'ID,Trámite,Subtítulo,Cliente,Estado,Fecha,Responsable,Prioridad';
    const lines = rows.map(r =>
      `${r.id},"${r.name}","${r.subtitle}","${r.clientName}",${r.status},${r.date},"${r.responsible ?? ''}",${r.priority ?? ''}`
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tramites.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  statusClass(status: TramiteStatus): string {
    return status === 'En Proceso' ? 'status--process' : status === 'Completado' ? 'status--done' : 'status--pending';
  }

  priorityClass(p?: string): string {
    return p === 'Alta' ? 'prio--high' : p === 'Media' ? 'prio--med' : 'prio--low';
  }
}
