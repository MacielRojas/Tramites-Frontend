import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const funcionarioGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.hasRole('ROLE_FUNCIONARIO')) return true;
  router.navigate(['/login']);
  return false;
};
