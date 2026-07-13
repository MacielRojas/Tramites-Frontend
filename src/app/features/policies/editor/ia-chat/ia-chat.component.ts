import { Component, inject, signal, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DiagramData, DiagramNode, DiagramEdge, SwimLane, NodeType, TipoCampoNodo } from '../policy-editor.component';

interface IaElemento {
  id: string;
  tipo: 'inicio' | 'accion' | 'decision' | 'fin' | 'fork' | 'join';
  nombre: string;
  swimlane: string;
  orden: number;
  campos?: any[];
}

interface IaResult {
  elementos: IaElemento[];
  swimlanes: string[];
  descripcion: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  iaResult?: IaResult;
  loading?: boolean;
}

// Must match policy-editor constants
const LANE_H        = 160;
const LABEL_W       = 90;
const LANE_W_VERT   = 220;
const LABEL_H_VERT  = 44;
const CANVAS_H_VERT = 720;
const CANVAS_W      = 1200;

@Component({
  selector: 'app-ia-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ia-chat.component.html',
  styleUrl: './ia-chat.component.scss'
})
export class IaChatComponent implements AfterViewChecked {
  private http = inject(HttpClient);

  @Input({ required: true }) diagram!: DiagramData;
  @Input() vertical = false;
  @Output() applyDiagram = new EventEmitter<DiagramData>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('chatScroll') scrollEl!: ElementRef<HTMLDivElement>;

  messages = signal<ChatMsg[]>([{
    role: 'assistant',
    text: 'Hola! Soy tu asistente de diseño UML. Puedo analizar el diagrama actual y sugerirte cómo mejorarlo, o ayudarte a modelar un proceso nuevo. ¿Qué necesitas?'
  }]);

  inputText = signal('');
  sending   = signal(false);
  private shouldScroll = false;

  readonly quickActions = [
    { label: 'Analizar diagrama', text: 'Analiza el diagrama actual e indica qué falta o qué se puede mejorar.' },
    { label: '¿Qué falta?',       text: '¿Qué nodos o pasos importantes faltan en este flujo de trámite?' },
    { label: 'Mejorar UML 2.5',   text: 'Sugiere mejoras siguiendo buenas prácticas UML 2.5 para este diagrama.' },
  ];

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  private scrollToBottom(): void {
    const el = this.scrollEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Send ──────────────────────────────────────────

  send(text?: string): void {
    const msg = (text ?? this.inputText()).trim();
    if (!msg || this.sending()) return;
    this.inputText.set('');
    this.sending.set(true);

    this.messages.update(m => [
      ...m,
      { role: 'user', text: msg },
      { role: 'assistant', text: '', loading: true }
    ]);
    this.shouldScroll = true;

    this.http.post<IaResult>('/ia-svc/api/ia/consulta', {
      texto: msg,
      contexto: this.buildContext()
    }).subscribe({
      next: (result) => {
        this.messages.update(msgs => {
          const copy = [...msgs];
          copy[copy.length - 1] = {
            role: 'assistant',
            text: result.descripcion ?? 'Aquí tienes mi sugerencia:',
            iaResult: result
          };
          return copy;
        });
        this.sending.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        const errMsg = err.status === 0
          ? 'No se pudo conectar con el servicio de IA (puerto 8000).'
          : `Error ${err.status}: ${err.error?.detail ?? 'Servicio de IA no disponible.'}`;
        this.messages.update(msgs => {
          const copy = [...msgs];
          copy[copy.length - 1] = { role: 'assistant', text: errMsg };
          return copy;
        });
        this.sending.set(false);
        this.shouldScroll = true;
      }
    });
  }

  private buildContext(): string {
    const d = this.diagram;
    const nodesInfo = d.nodes.map(n => {
      const camposStr = n.campos && n.campos.length > 0
        ? ` (campos: ${n.campos.map(c => `${c.etiqueta}[${c.tipo}]`).join(', ')})`
        : '';
      return `${n.id}(${n.type}:"${n.label}"${camposStr})`;
    }).join(', ');

    const edgesInfo = d.edges.map(e => {
      const fromNode = d.nodes.find(n => n.id === e.fromId);
      const toNode = d.nodes.find(n => n.id === e.toId);
      return fromNode && toNode ? `"${fromNode.label}" -> "${toNode.label}"` : '';
    }).filter(Boolean).join(', ');

    return `Diagrama actual:\n- Carriles: [${d.lanes.map(l => l.label).join(', ')}]\n- Nodos: [${nodesInfo}]\n- Conexiones: [${edgesInfo}]`;
  }

  // ── REEMPLAZAR: distribución uniforme en todo el canvas ───────────────────

  replaceWithResult(result: IaResult): void {
    // Use only the IA-suggested lanes (fresh names), ignoring existing ones
    const lanes: SwimLane[] = result.swimlanes.length > 0
      ? result.swimlanes.map(label => ({ id: `l${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label }))
      : this.diagram.lanes;
    const nodes = this.distributeNodes(result.elementos, lanes, 0, this.canvasW(), this.canvasH());
    const edges = this.chainEdges(nodes);
    this.applyDiagram.emit({ lanes, nodes, edges });
    this.pushConfirm(`✓ Diagrama reemplazado con la sugerencia IA (${nodes.length} nodos, ${lanes.length} carriles).`);
  }

  // ── AÑADIR: posicionar después de los nodos existentes, sin duplicados ────

  appendResult(result: IaResult): void {
    const existing     = this.diagram;
    const merged       = this.mergeLanes(result.swimlanes);
    const existingNames = new Set(existing.nodes.map(n => n.label.toLowerCase().trim()));
    const nuevos       = result.elementos.filter(el => !existingNames.has(el.nombre.toLowerCase().trim()));

    if (nuevos.length === 0) {
      this.pushConfirm('La IA no sugirió nodos nuevos que no existan ya en el diagrama.');
      return;
    }

    // Compute offset so new nodes start AFTER existing ones
    const offsetX = this.vertical ? 0 : this.nodeMaxX(existing.nodes) + 160;
    const offsetY = this.vertical ? this.nodeMaxY(existing.nodes) + 120 : 0;

    // Available space from offset to canvas end
    const availW = this.canvasW() - offsetX;
    const availH = this.canvasH() - offsetY;

    const newNodes = this.distributeNodes(nuevos, merged, offsetX, availW, availH);
    const newEdges = this.chainEdges(newNodes);

    this.applyDiagram.emit({
      lanes: merged,
      nodes: [...existing.nodes, ...newNodes],
      edges: [...existing.edges, ...newEdges]
    });
    this.pushConfirm(`✓ ${newNodes.length} nodo(s) añadido(s) al diagrama.`);
  }

  // ── Core: distribute N nodes evenly across available space ───────────────

  private distributeNodes(
    elementos: IaElemento[],
    lanes: SwimLane[],
    offsetStart: number,  // starting x (horiz) or y (vert)
    availW: number,
    availH: number
  ): DiagramNode[] {
    const sorted = [...elementos].sort((a, b) => a.orden - b.orden);
    const n = sorted.length;
    if (n === 0) return [];

    const laneIdx = (label: string) => {
      const i = lanes.findIndex(l => l.label.toLowerCase() === label.toLowerCase());
      return i >= 0 ? i : 0;
    };

    return sorted.map((el, i) => {
      const li  = laneIdx(el.swimlane);
      // Fraction of position within the available span [0..1]
      const frac = n === 1 ? 0.5 : i / (n - 1);
      let x: number, y: number;

      if (this.vertical) {
        // Lane = column → x is column center, y is spread vertically
        const margin = 70;
        x = li * LANE_W_VERT + LANE_W_VERT / 2;
        y = offsetStart + margin + frac * (availH - margin * 2);
        y = Math.max(LABEL_H_VERT + 40, Math.min(CANVAS_H_VERT - 40, y));
      } else {
        // Lane = row → y is row center, x is spread horizontally
        const margin = 80;
        x = offsetStart + margin + frac * (availW - margin * 2);
        x = Math.max(LABEL_W + 30, x);
        y = li * LANE_H + LANE_H / 2;
      }

      return {
        id:    `ia_${el.id}_${Date.now() + i}`,
        type:  this.mapType(el.tipo),
        label: el.nombre,
        x, y,
        campos: (el.campos ?? []).map((c: any) => ({
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          etiqueta: c.etiqueta || c.nombre || 'Campo',
          tipo: (c.tipo ?? 'TEXT').toUpperCase() as TipoCampoNodo,
          requerido: !!c.requerido
        }))
      };
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private mergeLanes(suggestedLabels: string[]): SwimLane[] {
    const existingLabels = this.diagram.lanes.map(l => l.label.toLowerCase());
    const newLanes = suggestedLabels
      .filter(s => !existingLabels.includes(s.toLowerCase()))
      .map(label => ({ id: `l${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label }));
    return [...this.diagram.lanes, ...newLanes];
  }

  private chainEdges(nodes: DiagramNode[]): DiagramEdge[] {
    return nodes.slice(0, -1).map((n, i) => ({
      id:     `ia_e${Date.now() + i}`,
      fromId: n.id,
      toId:   nodes[i + 1].id
    }));
  }

  /** Rightmost node center X in horizontal mode. */
  private nodeMaxX(nodes: DiagramNode[]): number {
    return nodes.length > 0 ? Math.max(...nodes.map(n => n.x)) : LABEL_W + 100;
  }

  /** Bottommost node center Y in vertical mode. */
  private nodeMaxY(nodes: DiagramNode[]): number {
    return nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) : LABEL_H_VERT + 80;
  }

  /** Effective canvas width (horizontal mode). */
  private canvasW(): number {
    if (this.vertical) return this.diagram.lanes.length * LANE_W_VERT;
    // Use same dynamic logic as policy-editor
    const maxNodeX = this.diagram.nodes.reduce((m, n) => Math.max(m, n.x + 80), 0);
    return Math.max(CANVAS_W, maxNodeX + 120);
  }

  /** Effective canvas height. */
  private canvasH(): number {
    return this.vertical ? CANVAS_H_VERT : this.diagram.lanes.length * LANE_H;
  }

  private pushConfirm(text: string): void {
    this.messages.update(m => [...m, { role: 'assistant', text }]);
    this.shouldScroll = true;
  }

  private mapType(tipo: IaElemento['tipo']): NodeType {
    switch (tipo) {
      case 'inicio':   return 'initial';
      case 'decision': return 'decision';
      case 'fin':      return 'final';
      default:         return 'activity';
    }
  }

  typeIcon(tipo: IaElemento['tipo']): string {
    switch (tipo) {
      case 'inicio':   return '●';
      case 'accion':   return '▭';
      case 'decision': return '◆';
      case 'fin':      return '◉';
      default:         return '▷';
    }
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }
}
