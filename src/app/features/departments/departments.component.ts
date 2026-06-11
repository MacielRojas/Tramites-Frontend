import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ActiveProject {
  name: string;
  progress: number;
  status: 'active' | 'planning' | 'review';
}

export interface Department {
  id: string;
  icon: string;
  name: string;
  description: string;
  leaderName: string;
  leaderRole: string;
  leaderInitials: string;
  leaderColor: string;
  memberCount: number;
  location?: string;
  email?: string;
  activeProjects?: ActiveProject[];
}

const COLORS = ['#8b4b5a','#5d6237','#2e7d8c','#c4748a','#7b5ea7','#4a7c59'];
const ICONS  = ['gavel','account_balance','diversity_3','computer','settings_suggest','science','local_shipping','campaign'];

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departments.component.html',
  styleUrl: './departments.component.scss'
})
export class DepartmentsComponent {
  stats = [
    { label: 'Total Miembros', value: '1,248', icon: 'group' },
    { label: 'Sedes Activas',  value: '12',    icon: 'location_on' },
    { label: 'Jerarquías',     value: '04',    icon: 'account_tree' },
    { label: 'Auditados',      value: '100%',  icon: 'verified' },
  ];

  deptsList = signal<Department[]>([
    {
      id: 'legal', icon: 'gavel', name: 'Legal y Cumplimiento',
      description: 'Asesoría jurídica integral y gestión de normativas corporativas.',
      leaderName: 'Dra. Elena Vázquez', leaderRole: 'Jefa de Área', leaderInitials: 'EV', leaderColor: '#c4748a',
      memberCount: 24, location: 'Sede Central', email: 'legal@tramiteflow.com',
    },
    {
      id: 'finanzas', icon: 'account_balance', name: 'Finanzas',
      description: 'Planificación financiera, contabilidad y tesorería estratégica.',
      leaderName: 'Roberto Méndez', leaderRole: 'Director Financiero', leaderInitials: 'RM', leaderColor: '#5d6237',
      memberCount: 18, location: 'Torre Financiera', email: 'finanzas@tramiteflow.com',
    },
    {
      id: 'rrhh', icon: 'diversity_3', name: 'Recursos Humanos',
      description: 'Gestión del talento, cultura organizacional y bienestar.',
      leaderName: 'Sonia Rivera', leaderRole: 'Gerente de Talento', leaderInitials: 'SR', leaderColor: '#8b4b5a',
      memberCount: 32, location: 'Sede Central', email: 'rrhh@tramiteflow.com',
    },
    {
      id: 'ti', icon: 'computer', name: 'Tecnología e Innovación',
      description: 'Desarrollo de software, infraestructura cloud y seguridad digital.',
      leaderName: 'Marco Polo', leaderRole: 'CTO', leaderInitials: 'MP', leaderColor: '#2e7d8c',
      memberCount: 86, location: 'Campus Tech', email: 'ti@tramiteflow.com',
      activeProjects: [
        { name: 'Migración Cloud 2.0',  progress: 80, status: 'active'   },
        { name: 'Portal Autogestión',   progress: 36, status: 'active'   },
        { name: 'Seguridad Perimetral', progress: 0,  status: 'planning' },
      ]
    },
    {
      id: 'operaciones', icon: 'settings_suggest', name: 'Operaciones',
      description: 'Gestión de procesos operativos y optimización de flujos de trabajo.',
      leaderName: 'Isabel Castillo', leaderRole: 'Directora de Ops.', leaderInitials: 'IC', leaderColor: '#7b5ea7',
      memberCount: 45, location: 'Sede Norte', email: 'ops@tramiteflow.com',
    },
  ]);

  showNewModal    = signal(false);
  showDetailModal = signal(false);
  selectedDept    = signal<Department | null>(null);
  private nextId  = 100;

  newForm: Partial<Department> = {
    name: '', description: '', leaderName: '', leaderRole: '', memberCount: 1,
    location: '', email: '', icon: 'apartment'
  };

  readonly availableIcons = ICONS;

  openDetail(dept: Department): void {
    this.selectedDept.set(dept);
    this.showDetailModal.set(true);
  }

  deleteDept(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm('¿Eliminar este departamento?')) {
      this.deptsList.update(list => list.filter(d => d.id !== id));
    }
  }

  openNew(): void {
    this.newForm = { name: '', description: '', leaderName: '', leaderRole: '', memberCount: 1, location: '', email: '', icon: 'apartment' };
    this.showNewModal.set(true);
  }

  submitNew(): void {
    if (!this.newForm.name?.trim() || !this.newForm.leaderName?.trim()) return;
    const initials = this.newForm.leaderName!.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
    const color = COLORS[this.nextId % COLORS.length];
    const dept: Department = {
      id:             `dept-${this.nextId++}`,
      icon:           this.newForm.icon || 'apartment',
      name:           this.newForm.name!,
      description:    this.newForm.description || '',
      leaderName:     this.newForm.leaderName!,
      leaderRole:     this.newForm.leaderRole || 'Responsable',
      leaderInitials: initials,
      leaderColor:    color,
      memberCount:    this.newForm.memberCount ?? 1,
      location:       this.newForm.location || '',
      email:          this.newForm.email || '',
    };
    this.deptsList.update(list => [...list, dept]);
    this.showNewModal.set(false);
  }

  statusLabel(status: ActiveProject['status']): string {
    return status === 'active' ? 'Activo' : status === 'planning' ? 'Planificación' : 'Revisión';
  }
}
