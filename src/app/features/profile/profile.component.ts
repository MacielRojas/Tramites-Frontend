import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private auth = inject(AuthService);

  private rawUser = this.auth.getCurrentUser();

  profileForm = signal({
    username:  this.rawUser?.username ?? 'usuario',
    email:     this.rawUser?.email    ?? '',
    fullName:  '',
    phone:     '',
    position:  '',
    department:'',
    bio:       '',
  });

  pwForm = signal({ current: '', next: '', confirm: '' });

  showPwCurrent = signal(false);
  showPwNext    = signal(false);
  saveSuccess   = signal(false);
  pwSuccess     = signal(false);
  pwError       = signal('');

  get roles(): string[] { return this.rawUser?.roles ?? []; }

  get initials(): string {
    return (this.profileForm().username ?? 'U').slice(0, 2).toUpperCase();
  }

  get roleLabel(): string {
    const r = this.roles;
    if (r.includes('ROLE_ADMIN'))       return 'Administrador';
    if (r.includes('ROLE_FUNCIONARIO')) return 'Funcionario';
    return 'Cliente';
  }

  updateField(field: string, value: string): void {
    this.profileForm.update(f => ({ ...f, [field]: value }));
  }

  saveProfile(): void {
    const user = this.auth.getCurrentUser();
    if (user) {
      const updated = { ...user, username: this.profileForm().username, email: this.profileForm().email };
      localStorage.setItem('tramiteflow_user', JSON.stringify(updated));
    }
    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 3000);
  }

  savePassword(): void {
    const f = this.pwForm();
    this.pwError.set('');
    if (!f.current.trim()) { this.pwError.set('Ingresa tu contraseña actual.'); return; }
    if (f.next.length < 6) { this.pwError.set('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    if (f.next !== f.confirm) { this.pwError.set('Las contraseñas no coinciden.'); return; }
    // Simulated: backend call would go here
    this.pwForm.set({ current: '', next: '', confirm: '' });
    this.pwSuccess.set(true);
    setTimeout(() => this.pwSuccess.set(false), 3000);
  }

  updatePwField(field: string, value: string): void {
    this.pwForm.update(f => ({ ...f, [field]: value }));
  }
}
