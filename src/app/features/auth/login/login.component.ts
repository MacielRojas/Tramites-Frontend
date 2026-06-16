import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    remember: [false]
  });

  showPassword = signal(false);
  loading = signal(false);
  errorMessage = signal('');

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { username, password } = this.form.getRawValue();
    this.auth.login({ username, password }).subscribe({
      next: () => {
        const roles = this.auth.getCurrentUser()?.roles ?? [];
        if (roles.includes('ROLE_ADMIN')) {
          this.router.navigate(['/dashboard']);
        } else if (roles.includes('ROLE_FUNCIONARIO')) {
          this.router.navigate(['/funcionario/dashboard']);
        } else if (roles.includes('ROLE_CLIENTE')) {
          this.router.navigate(['/cliente/dashboard']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        const msg = err.error?.message ?? (err.status === 401 ? 'Usuario o contraseña incorrectos.' : 'Error al conectar con el servidor.');
        this.errorMessage.set(msg);
        this.loading.set(false);
      }
    });
  }
}
