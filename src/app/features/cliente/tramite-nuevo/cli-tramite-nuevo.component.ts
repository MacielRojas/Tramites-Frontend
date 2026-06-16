import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { Politica } from '../../../core/models/api.models';

@Component({
  selector: 'app-cli-tramite-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cli-tramite-nuevo.component.html',
  styleUrl: './cli-tramite-nuevo.component.scss'
})
export class CliTramiteNuevoComponent implements OnInit {
  private api    = inject(TramitesApiService);
  private router = inject(Router);

  politicas    = signal<Politica[]>([]);
  loadingPols  = signal(true);

  form = {
    titulo:      '',
    descripcion: '',
    politicaId:  '',
  };

  submitting = signal(false);
  error      = signal('');

  get isValid(): boolean {
    return this.form.titulo.trim().length > 0 && this.form.politicaId.length > 0;
  }

  ngOnInit(): void {
    this.api.getPoliticas().subscribe({
      next:  p => { this.politicas.set(p); this.loadingPols.set(false); },
      error: () => { this.loadingPols.set(false); }
    });
  }

  submit(): void {
    if (!this.isValid) return;
    this.submitting.set(true); this.error.set('');
    this.api.createTramite(
      this.form.politicaId,
      this.form.titulo.trim(),
      this.form.descripcion.trim()
    ).subscribe({
      next: t => this.router.navigate(['/cliente/tramites/detalle', t.id]),
      error: (e: any) => {
        this.error.set(e.error?.message ?? 'Error al crear el trámite.');
        this.submitting.set(false);
      }
    });
  }

  cancel(): void { this.router.navigate(['/cliente/dashboard']); }
}
