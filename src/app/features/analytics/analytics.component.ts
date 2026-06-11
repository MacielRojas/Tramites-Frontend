import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BarDataPoint {
  month: string;
  current: number;
  prev: number;
}

interface Department {
  icon: string;
  name: string;
  members: number;
  tickets: number;
  resolution: number;
  performance: number;
  perfColor: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent {
  barData: BarDataPoint[] = [
    { month: 'Ene', current: 38, prev: 28 },
    { month: 'Feb', current: 50, prev: 36 },
    { month: 'Mar', current: 55, prev: 42 },
    { month: 'Abr', current: 88, prev: 52 },
    { month: 'May', current: 72, prev: 48 },
    { month: 'Jun', current: 65, prev: 44 },
    { month: 'Jul', current: 60, prev: 40 },
  ];

  departments: Department[] = [
    { icon: 'gavel',       name: 'Asuntos Legales',     members: 24, tickets: 342, resolution: 92, performance: 92, perfColor: 'primary' },
    { icon: 'account_balance', name: 'Finanzas e Impuestos', members: 18, tickets: 156, resolution: 88, performance: 88, perfColor: 'secondary' },
    { icon: 'people',      name: 'Recursos Humanos',    members: 12, tickets: 89,  resolution: 96, performance: 96, perfColor: 'primary' },
  ];

  // Donut: circumference = 2π×45 ≈ 282.7
  // Segments: Solicitudes 52%, Externos 33%, Manuales 15%
  readonly C = 2 * Math.PI * 45; // 282.74

  exportReport(): void {
    const rows = [
      ['Métrica', 'Valor', 'Variación'],
      ['Total de Trámites', '1284', '+12%'],
      ['Tiempo Prom. Proceso', '4.2 días', '-5%'],
      ['Tasa de Aprobación', '94.8%', 'Estable'],
      ['Acciones Pendientes', '42', '+2%'],
      ['', '', ''],
      ['Mes', 'Año Actual (%)', 'Año Anterior (%)'],
      ...this.barData.map(d => [d.month, String(d.current), String(d.prev)]),
      ['', '', ''],
      ['Departamento', 'Tickets', 'Tasa Resolución', 'Desempeño'],
      ...this.departments.map(d => [d.name, String(d.tickets), d.resolution + '%', d.performance + '%']),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analitica_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  get donutSegments() {
    const data = [
      { pct: 52, color: '#8b4b5a', label: 'Solicitudes Internas' },
      { pct: 33, color: '#5d6237', label: 'Portales Externos' },
      { pct: 15, color: '#bdbebe', label: 'Cargas Manuales' },
    ];
    let offset = 0;
    return data.map(d => {
      const dasharray = `${(d.pct / 100) * this.C} ${this.C}`;
      const dashoffset = -(offset / 100) * this.C;
      offset += d.pct;
      return { ...d, dasharray, dashoffset };
    });
  }
}
