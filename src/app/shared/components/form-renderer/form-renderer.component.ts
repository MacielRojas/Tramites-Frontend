import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormularioPlantilla, CampoFormulario } from '../../../core/models/api.models';

@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-renderer.component.html',
  styleUrl: './form-renderer.component.scss'
})
export class FormRendererComponent implements OnInit {
  @Input() plantilla!: FormularioPlantilla;
  @Input() readOnly = false;
  @Input() initialValues: Record<string, unknown> = {};
  @Output() formSubmit = new EventEmitter<Record<string, unknown>>();

  valores = signal<Record<string, unknown>>({});
  gridRows = signal<Record<string, Record<string, unknown>[]>>({});

  ngOnInit(): void {
    if (this.initialValues && Object.keys(this.initialValues).length) {
      this.valores.set({ ...this.initialValues });
    }
  }

  sortedCampos(): CampoFormulario[] {
    return [...(this.plantilla?.campos ?? [])].sort((a, b) => a.orden - b.orden);
  }

  getValor(id: string): unknown {
    return this.valores()[id] ?? '';
  }

  setValor(id: string, v: unknown): void {
    this.valores.update(m => ({ ...m, [id]: v }));
  }

  isChecked(id: string, opt: string): boolean {
    const v = this.valores()[id];
    return Array.isArray(v) && v.includes(opt);
  }

  toggleCheck(id: string, opt: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.valores.update(m => {
      const current = Array.isArray(m[id]) ? [...(m[id] as string[])] : [];
      return { ...m, [id]: checked ? [...current, opt] : current.filter(x => x !== opt) };
    });
  }

  getGridRows(id: string): Record<string, unknown>[] {
    return this.gridRows()[id] ?? [];
  }

  addGridRow(id: string): void {
    this.gridRows.update(g => ({ ...g, [id]: [...(g[id] ?? []), {}] }));
  }

  removeGridRow(id: string, idx: number): void {
    this.gridRows.update(g => {
      const rows = [...(g[id] ?? [])];
      rows.splice(idx, 1);
      return { ...g, [id]: rows };
    });
  }

  setGridCell(campoId: string, rowIdx: number, colKey: string, val: unknown): void {
    this.gridRows.update(g => {
      const rows = [...(g[campoId] ?? [])];
      rows[rowIdx] = { ...rows[rowIdx], [colKey]: val };
      return { ...g, [campoId]: rows };
    });
  }

  colInputType(tipo: string): string {
    const map: Record<string, string> = { NUMBER: 'number', DATE: 'date' };
    return map[tipo] ?? 'text';
  }

  submit(): void {
    const result: Record<string, unknown> = { ...this.valores() };
    // Merge grid rows
    for (const [key, rows] of Object.entries(this.gridRows())) {
      result[key] = rows;
    }
    this.formSubmit.emit(result);
  }

  isValid(): boolean {
    return this.sortedCampos()
      .filter(c => c.requerido)
      .every(c => {
        const v = this.valores()[c.id];
        if (c.tipo === 'CHECKLIST') return Array.isArray(v) && v.length > 0;
        if (c.tipo === 'GRID') return (this.gridRows()[c.id] ?? []).length > 0;
        return v !== null && v !== undefined && v !== '';
      });
  }
}
