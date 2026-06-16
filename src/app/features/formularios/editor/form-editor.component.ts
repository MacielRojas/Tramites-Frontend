import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormularioService } from '../../../core/services/formulario.service';
import { TramitesApiService } from '../../../core/services/tramites-api.service';
import { FormularioPlantilla, CampoFormulario, ColumnaDef, TipoCampo, Politica } from '../../../core/models/api.models';

interface PaletteItem {
  tipo: TipoCampo;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-form-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './form-editor.component.html',
  styleUrl: './form-editor.component.scss'
})
export class FormEditorComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private formSvc = inject(FormularioService);
  private api     = inject(TramitesApiService);

  campos           = signal<CampoFormulario[]>([]);
  campoSeleccionado = signal<CampoFormulario | null>(null);
  politicas        = signal<Politica[]>([]);
  loading          = signal(false);
  saving           = signal(false);
  error            = signal('');
  success          = signal('');

  nombre          = signal('Nuevo Formulario');
  descripcion     = signal('');
  politicaId      = signal('');
  nombrePolitica  = signal('');

  readonly palette: PaletteItem[] = [
    { tipo: 'TEXT',      label: 'Texto',       icon: 'text_fields' },
    { tipo: 'TEXTAREA',  label: 'Texto largo',  icon: 'notes' },
    { tipo: 'NUMBER',    label: 'Número',       icon: 'tag' },
    { tipo: 'DATE',      label: 'Fecha',        icon: 'calendar_month' },
    { tipo: 'CHECKLIST', label: 'Checklist',    icon: 'checklist' },
    { tipo: 'SELECTOR',  label: 'Selector',     icon: 'arrow_drop_down_circle' },
    { tipo: 'RADIO',     label: 'Opción única', icon: 'radio_button_checked' },
    { tipo: 'GRID',      label: 'Tabla/Grid',   icon: 'table' },
  ];

  get editId(): string | null { return this.route.snapshot.paramMap.get('id'); }

  ngOnInit(): void {
    this.api.getPoliticas().subscribe({
      next: politicas => {
        this.politicas.set(politicas);
        if (this.editId) this.loadFormulario(this.editId);
      },
      error: () => {
        if (this.editId) this.loadFormulario(this.editId);
      }
    });
  }

  private loadFormulario(id: string): void {
    this.loading.set(true);
    this.formSvc.getById(id).subscribe({
      next: f => {
        this.nombre.set(f.nombre);
        this.descripcion.set(f.descripcion ?? '');
        this.politicaId.set(f.politicaId ?? '');
        this.nombrePolitica.set(f.nombrePolitica ?? '');
        this.campos.set(f.campos ?? []);
        this.loading.set(false);
      },
      error: () => { this.error.set('No se pudo cargar el formulario.'); this.loading.set(false); }
    });
  }

  // ── Canvas interactions ─────────────────────────────────────────────────────

  onDropFromPalette(tipo: TipoCampo): void {
    const nuevo = this.buildCampo(tipo);
    this.campos.update(arr => [...arr, nuevo]);
    this.campoSeleccionado.set(nuevo);
  }

  onCanvasDrop(event: CdkDragDrop<CampoFormulario[]>): void {
    if (event.previousContainer === event.container) {
      const arr = [...this.campos()];
      moveItemInArray(arr, event.previousIndex, event.currentIndex);
      arr.forEach((c, i) => c.orden = i);
      this.campos.set(arr);
    }
  }

  selectCampo(c: CampoFormulario): void {
    this.campoSeleccionado.set(c);
  }

  removeCampo(id: string): void {
    this.campos.update(arr => arr.filter(c => c.id !== id));
    if (this.campoSeleccionado()?.id === id) this.campoSeleccionado.set(null);
  }

  // ── Properties panel ────────────────────────────────────────────────────────

  updateCampoField(field: keyof CampoFormulario, value: unknown): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;
    const updated = { ...sel, [field]: value };
    this.campoSeleccionado.set(updated as CampoFormulario);
    this.campos.update(arr => arr.map(c => c.id === sel.id ? updated as CampoFormulario : c));
  }

  addOpcion(): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;
    const opts = [...(sel.opciones ?? []), `Opción ${(sel.opciones?.length ?? 0) + 1}`];
    this.updateCampoField('opciones', opts);
  }

  removeOpcion(idx: number): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;
    const opts = (sel.opciones ?? []).filter((_, i) => i !== idx);
    this.updateCampoField('opciones', opts);
  }

  updateOpcion(idx: number, val: string): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;
    const opts = [...(sel.opciones ?? [])];
    opts[idx] = val;
    this.updateCampoField('opciones', opts);
  }

  addColumna(): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;
    const cols: ColumnaDef[] = [...(sel.columnas ?? []), {
      key: `col${(sel.columnas?.length ?? 0) + 1}`,
      label: `Columna ${(sel.columnas?.length ?? 0) + 1}`,
      tipo: 'TEXT'
    }];
    this.updateCampoField('columnas', cols);
  }

  removeColumna(idx: number): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;
    const cols = (sel.columnas ?? []).filter((_, i) => i !== idx);
    this.updateCampoField('columnas', cols);
  }

  updateColumna(idx: number, field: keyof ColumnaDef, val: string): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;
    const cols = [...(sel.columnas ?? [])];
    cols[idx] = { ...cols[idx], [field]: val };
    this.updateCampoField('columnas', cols);
  }

  onPoliticaChange(id: string): void {
    this.politicaId.set(id);
    const p = this.politicas().find(x => x.id === id);
    this.nombrePolitica.set(p?.nombre ?? '');
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  save(): void {
    if (!this.nombre().trim()) { this.error.set('El nombre es obligatorio.'); return; }
    this.saving.set(true);
    this.error.set('');

    const campos = this.campos().map((c, i) => ({ ...c, orden: i }));
    const data: FormularioPlantilla = {
      nombre: this.nombre(),
      descripcion: this.descripcion(),
      politicaId: this.politicaId() || undefined,
      nombrePolitica: this.nombrePolitica() || undefined,
      campos
    };

    const obs = this.editId
      ? this.formSvc.update(this.editId, data)
      : this.formSvc.create(data);

    obs.subscribe({
      next: () => {
        this.success.set('Formulario guardado correctamente.');
        this.saving.set(false);
        setTimeout(() => this.router.navigate(['/formularios']), 1000);
      },
      error: () => { this.error.set('Error al guardar el formulario.'); this.saving.set(false); }
    });
  }

  goBack(): void { this.router.navigate(['/formularios']); }

  tipoCampoIcon(tipo: string): string {
    return this.palette.find(p => p.tipo === tipo)?.icon ?? 'text_fields';
  }

  hasOpciones(tipo: string): boolean {
    return ['CHECKLIST', 'SELECTOR', 'RADIO'].includes(tipo);
  }

  private buildCampo(tipo: TipoCampo): CampoFormulario {
    const labels: Record<TipoCampo, string> = {
      TEXT: 'Campo de texto', TEXTAREA: 'Texto largo', NUMBER: 'Número', DATE: 'Fecha',
      CHECKLIST: 'Lista de opciones', SELECTOR: 'Desplegable', RADIO: 'Opción única', GRID: 'Tabla'
    };
    return {
      id: crypto.randomUUID(),
      tipo,
      etiqueta: labels[tipo],
      placeholder: '',
      requerido: false,
      orden: this.campos().length,
      opciones: ['CHECKLIST', 'SELECTOR', 'RADIO'].includes(tipo) ? ['Opción 1', 'Opción 2'] : undefined,
      columnas: tipo === 'GRID' ? [{ key: 'col1', label: 'Columna 1', tipo: 'TEXT' }] : undefined,
    };
  }
}
