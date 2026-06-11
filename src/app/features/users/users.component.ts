import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type UserRole = 'ROLE_ADMIN' | 'ROLE_FUNCIONARIO' | 'ROLE_CLIENTE';
export type UserStatus = 'activo' | 'inactivo' | 'suspendido';

export interface AppUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  createdAt: string;
  initials: string;
  avatarColor: string;
}

const COLORS = ['#8b4b5a','#5d6237','#2e7d8c','#c4748a','#7b5ea7','#4a7c59'];
const DEPTS  = ['Legal y Cumplimiento','Finanzas','Recursos Humanos','Tecnología e Innovación','Operaciones','Sin departamento'];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  private nextId = 200;

  usersList = signal<AppUser[]>([
    { id: 'u1',  username: 'alice.morgan',   email: 'alice@tramiteflow.com',   role: 'ROLE_FUNCIONARIO', status: 'activo',    department: 'Recursos Humanos',         createdAt: '12 Oct 2023', initials: 'AM', avatarColor: '#8b4b5a' },
    { id: 'u2',  username: 'benjamin.chen',  email: 'bchen@tramiteflow.com',   role: 'ROLE_FUNCIONARIO', status: 'activo',    department: 'Legal y Cumplimiento',     createdAt: '09 Oct 2023', initials: 'BC', avatarColor: '#5d6237' },
    { id: 'u3',  username: 'diana.rose',     email: 'diana@tramiteflow.com',   role: 'ROLE_CLIENTE',     status: 'inactivo',  department: 'Sin departamento',         createdAt: '28 Sep 2023', initials: 'DR', avatarColor: '#2e7d8c' },
    { id: 'u4',  username: 'evan.knight',    email: 'evan@tramiteflow.com',    role: 'ROLE_FUNCIONARIO', status: 'suspendido',department: 'Operaciones',              createdAt: '15 Sep 2023', initials: 'EK', avatarColor: '#c4748a' },
    { id: 'u5',  username: 'sofia.luna',     email: 'sofia@tramiteflow.com',   role: 'ROLE_ADMIN',       status: 'activo',    department: 'Tecnología e Innovación',  createdAt: '01 Sep 2023', initials: 'SL', avatarColor: '#7b5ea7' },
    { id: 'u6',  username: 'mateo.garcia',   email: 'mateo@tramiteflow.com',   role: 'ROLE_CLIENTE',     status: 'activo',    department: 'Sin departamento',         createdAt: '20 Ago 2023', initials: 'MG', avatarColor: '#4a7c59' },
  ]);

  searchTerm       = signal('');
  filterRole       = signal<UserRole | 'Todos'>('Todos');
  filterStatus     = signal<UserStatus | 'Todos'>('Todos');
  showNewModal     = signal(false);
  showEditModal    = signal(false);
  showDeleteConfirm = signal<string | null>(null);
  selectedUser     = signal<AppUser | null>(null);

  newForm: Partial<AppUser> & { password: string } = {
    username: '', email: '', role: 'ROLE_CLIENTE', status: 'activo', department: 'Sin departamento', password: ''
  };
  editForm: Partial<AppUser> = {};

  readonly roles: UserRole[]        = ['ROLE_ADMIN', 'ROLE_FUNCIONARIO', 'ROLE_CLIENTE'];
  readonly statuses: UserStatus[]   = ['activo', 'inactivo', 'suspendido'];
  readonly departments               = DEPTS;

  filteredUsers = computed(() => {
    let list = this.usersList();
    const q = this.searchTerm().toLowerCase();
    if (q) list = list.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    const r = this.filterRole();
    if (r !== 'Todos') list = list.filter(u => u.role === r);
    const s = this.filterStatus();
    if (s !== 'Todos') list = list.filter(u => u.status === s);
    return list;
  });

  // ── Create ───────────────────────────────────────────

  openNew(): void {
    this.newForm = { username: '', email: '', role: 'ROLE_CLIENTE', status: 'activo', department: 'Sin departamento', password: '' };
    this.showNewModal.set(true);
  }

  submitNew(): void {
    if (!this.newForm.username?.trim() || !this.newForm.email?.trim()) return;
    const initials = this.newForm.username.split('.').slice(0,2).map(p => p[0]?.toUpperCase() ?? '').join('') || 'US';
    const color = COLORS[this.nextId % COLORS.length];
    const u: AppUser = {
      id:           `u${this.nextId++}`,
      username:     this.newForm.username!,
      email:        this.newForm.email!,
      role:         this.newForm.role as UserRole,
      status:       this.newForm.status as UserStatus,
      department:   this.newForm.department || 'Sin departamento',
      createdAt:    new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }),
      initials, avatarColor: color,
    };
    this.usersList.update(list => [u, ...list]);
    this.showNewModal.set(false);
  }

  // ── Edit ─────────────────────────────────────────────

  openEdit(user: AppUser): void {
    this.editForm = { ...user };
    this.selectedUser.set(user);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (!this.editForm.username?.trim()) return;
    const initials = this.editForm.username!.split('.').slice(0,2).map(p => p[0]?.toUpperCase() ?? '').join('') || 'US';
    this.usersList.update(list =>
      list.map(u => u.id === this.editForm.id ? { ...u, ...this.editForm, initials } as AppUser : u)
    );
    this.showEditModal.set(false);
  }

  // ── Delete ───────────────────────────────────────────

  askDelete(id: string): void   { this.showDeleteConfirm.set(id); }
  cancelDelete(): void           { this.showDeleteConfirm.set(null); }
  confirmDelete(): void {
    const id = this.showDeleteConfirm();
    if (id) this.usersList.update(list => list.filter(u => u.id !== id));
    this.showDeleteConfirm.set(null);
  }

  // ── Helpers ──────────────────────────────────────────

  roleLabel(r: UserRole): string {
    return r === 'ROLE_ADMIN' ? 'Administrador' : r === 'ROLE_FUNCIONARIO' ? 'Funcionario' : 'Cliente';
  }

  roleBadgeClass(r: UserRole): string {
    return r === 'ROLE_ADMIN' ? 'role--admin' : r === 'ROLE_FUNCIONARIO' ? 'role--func' : 'role--client';
  }

  statusClass(s: UserStatus): string {
    return s === 'activo' ? 'status--active' : s === 'inactivo' ? 'status--inactive' : 'status--suspended';
  }

  userToDelete(id: string | null): AppUser | undefined {
    return id ? this.usersList().find(u => u.id === id) : undefined;
  }
}
