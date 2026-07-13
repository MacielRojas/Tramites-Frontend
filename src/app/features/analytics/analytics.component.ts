import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

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

interface CuelloDeBotella {
  tramite: string;
  nivel: string;
  motivo: string;
  impacto: string;
  recomendacion: string;
}

interface AnaliticaIaResponse {
  resumen_ejecutivo: string;
  duracion_total_promedio_horas: number;
  cuellos_de_botella: CuelloDeBotella[];
  tramite_critico: string;
  eficiencia_general: string;
  recomendaciones_swimlane: string[];
  alertas: string[];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  private http = inject(HttpClient);

  // Métrica del Spring Boot
  totalTramitesDb = signal<number>(0);
  duracionPromedioDb = signal<number>(0);
  actividadesPendientesDb = signal<number>(0);
  tramitesUltimos7DiasDb = signal<number>(0);

  // Datos IA Cuellos de Botella
  iaResumen = signal<string>('Analizando flujos con IA...');
  iaCuellos = signal<CuelloDeBotella[]>([]);
  iaRecomendaciones = signal<string[]>([]);
  iaAlertas = signal<string[]>([]);
  iaEficiencia = signal<string>('');
  iaTramiteCritico = signal<string>('');
  loadingIa = signal(true);

  // Simulador de Anomalías (TensorFlow)
  tfTiempoEsperado = signal<number>(8.0);
  tfTiempoActual = signal<number>(12.0);
  tfAnomaliaResultado = signal<any>(null);
  tfLoading = signal(false);

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

  readonly C = 2 * Math.PI * 45; // 282.74

  ngOnInit(): void {
    this.cargarDatosDb();
  }

  private cargarDatosDb(): void {
    // 1. Obtener métricas básicas desde Spring Boot
    this.http.get<any>('/api/analitica').subscribe({
      next: (res) => {
        this.totalTramitesDb.set(res.totalTramites || 0);
        this.duracionPromedioDb.set(res.duracionPromedioHoras || 0);
        this.tramitesUltimos7DiasDb.set(res.tramitesUltimos7Dias || 0);
        
        const actPorEstado = res.actividadesPorEstado || {};
        this.actividadesPendientesDb.set((actPorEstado['PENDIENTE'] || 0) + (actPorEstado['EN_PROCESO'] || 0));

        // 2. Ejecutar análisis de IA de Python
        this.ejecutarAnaliticaIa(res);
      },
      error: () => {
        // Fallback si la DB está vacía o inactiva temporalmente
        this.ejecutarAnaliticaIa(null);
      }
    });
  }

  private ejecutarAnaliticaIa(dbRes: any): void {
    this.loadingIa.set(true);

    // Preparar lista de trámites reales y simulados
    const tramitesMetrics: any[] = [
      {
        nombre: 'Revisión y Aprobación Legal',
        duracion_promedio_horas: 74.5, // Cuello de botella crítico (> 72h)
        cantidad_instancias: 142,
        tasa_rechazo: 0.35, // Alta tasa de rechazo (> 20%)
        responsable: 'Asuntos Legales'
      },
      {
        nombre: 'Firma de Contratos',
        duracion_promedio_horas: 32.0, // Cuello de botella alto (> 24h)
        cantidad_instancias: 98,
        tasa_rechazo: 0.08,
        responsable: 'Finanzas e Impuestos'
      },
      {
        nombre: 'Registro de Solicitud de Vacaciones',
        duracion_promedio_horas: 2.5,
        cantidad_instancias: 210,
        tasa_rechazo: 0.02,
        responsable: 'Recursos Humanos'
      }
    ];

    // Integrar datos reales de la DB si existen
    if (dbRes && dbRes.totalTramites > 0) {
      tramitesMetrics.push({
        nombre: 'Trámites en Producción (Reales)',
        duracion_promedio_horas: dbRes.duracionPromedioHoras || 4.2,
        cantidad_instancias: dbRes.totalTramites,
        tasa_rechazo: 0.05,
        responsable: 'Operaciones'
      });
    }

    // Petición al microservicio de Python
    this.http.post<AnaliticaIaResponse>('/ia-svc/api/ia/analitica', {
      tramites: tramitesMetrics,
      periodo_dias: 30,
      objetivo_horas: 48.0
    }).subscribe({
      next: (res) => {
        this.iaResumen.set(res.resumen_ejecutivo);
        this.iaCuellos.set(res.cuellos_de_botella);
        this.iaRecomendaciones.set(res.recomendaciones_swimlane);
        this.iaAlertas.set(res.alertas);
        this.iaEficiencia.set(res.eficiencia_general);
        this.iaTramiteCritico.set(res.tramite_critico);
        this.loadingIa.set(false);
      },
      error: () => {
        this.iaResumen.set('Error de conexión con el servicio analítico de IA de Python (puerto 8000).');
        this.loadingIa.set(false);
      }
    });
  }

  probarTensorflowAnomalia(): void {
    this.tfLoading.set(true);
    this.tfAnomaliaResultado.set(null);

    this.http.post<any>('/ia-svc/api/ia/tensorflow/detectar-anomalia', {
      tiempo_actual: this.tfTiempoActual(),
      tiempo_esperado: this.tfTiempoEsperado()
    }).subscribe({
      next: (res) => {
        this.tfAnomaliaResultado.set(res);
        this.tfLoading.set(false);
      },
      error: () => {
        this.tfAnomaliaResultado.set({
          es_anomalia: false,
          mensaje: 'Error de conexión con el servicio TensorFlow (puerto 8000).'
        });
        this.tfLoading.set(false);
      }
    });
  }

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
