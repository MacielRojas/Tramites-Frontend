import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormularioService } from '../../core/services/formulario.service';
import { FormularioPlantilla } from '../../core/models/api.models';

@Component({
  selector: 'app-formularios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './formularios.component.html',
  styleUrl: './formularios.component.scss'
})
export class FormulariosComponent implements OnInit {
  private svc    = inject(FormularioService);
  private router = inject(Router);

  formularios = signal<FormularioPlantilla[]>([]);
  loading     = signal(true);
  error       = signal('');
  deleting    = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next:  f => { this.formularios.set(f); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los formularios.'); this.loading.set(false); }
    });
  }

  goToEditor(id?: string): void {
    if (id) this.router.navigate(['/formularios/editor', id]);
    else    this.router.navigate(['/formularios/editor']);
  }

  delete(id: string): void {
    if (!confirm('¿Eliminar este formulario?')) return;
    this.deleting.set(id);
    this.svc.delete(id).subscribe({
      next:  () => { this.formularios.update(f => f.filter(x => x.id !== id)); this.deleting.set(null); },
      error: () => { this.error.set('No se pudo eliminar el formulario.'); this.deleting.set(null); }
    });
  }
}
