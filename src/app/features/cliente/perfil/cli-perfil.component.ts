import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TramitesApiService } from '../../../core/services/tramites-api.service';

@Component({
  selector: 'app-cli-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cli-perfil.component.html',
  styleUrl: './cli-perfil.component.scss'
})
export class CliPerfilComponent {
  private auth = inject(AuthService);
  private api  = inject(TramitesApiService);

  private rawUser = this.auth.getCurrentUser();

  profileForm = {
    username: this.rawUser?.username ?? '',
    email:    this.rawUser?.email ?? '',
    fullName: '',
    phone:    '',
  };

  pwForm        = { currentPassword: '', newPassword: '', confirm: '' };
  showPwNew     = signal(false);
  savingProfile = signal(false);
  savingPw      = signal(false);
  profileMsg    = signal('');
  profileError  = signal('');
  pwMsg         = signal('');
  pwError       = signal('');

  get initials(): string { return (this.profileForm.username ?? 'C').slice(0, 2).toUpperCase(); }

  saveProfile(): void {
    this.savingProfile.set(true); this.profileMsg.set(''); this.profileError.set('');
    this.api.updatePerfil({ email: this.profileForm.email }).subscribe({
      next: () => {
        const u = this.auth.getCurrentUser();
        if (u) localStorage.setItem('tramiteflow_user', JSON.stringify({ ...u, email: this.profileForm.email }));
        this.profileMsg.set('Perfil actualizado correctamente.');
        this.savingProfile.set(false);
        setTimeout(() => this.profileMsg.set(''), 3000);
      },
      error: (e: any) => {
        this.profileError.set(e.error?.message ?? 'Error al actualizar el perfil.');
        this.savingProfile.set(false);
      }
    });
  }

  savePassword(): void {
    this.pwError.set(''); this.pwMsg.set('');
    if (this.pwForm.newPassword.length < 6) { this.pwError.set('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (this.pwForm.newPassword !== this.pwForm.confirm) { this.pwError.set('Las contraseñas no coinciden.'); return; }
    this.savingPw.set(true);
    this.api.changePassword({ newPassword: this.pwForm.newPassword }).subscribe({
      next: () => {
        this.pwForm = { currentPassword: '', newPassword: '', confirm: '' };
        this.pwMsg.set('Contraseña actualizada correctamente.');
        this.savingPw.set(false);
        setTimeout(() => this.pwMsg.set(''), 3000);
      },
      error: (e: any) => {
        this.pwError.set(e.error?.message ?? 'Error al cambiar la contraseña.');
        this.savingPw.set(false);
      }
    });
  }
}
