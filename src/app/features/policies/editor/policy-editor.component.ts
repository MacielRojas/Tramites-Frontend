import {
  Component, inject, signal, OnInit, HostListener, ElementRef, ViewChild, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyService, Policy } from '../../../core/services/policy.service';
import { IaChatComponent } from './ia-chat/ia-chat.component';

export type NodeType = 'initial' | 'activity' | 'decision' | 'final';

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  x: number; // center x in SVG canvas coords
  y: number; // center y in SVG canvas coords
}

export interface DiagramEdge {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}

export interface SwimLane {
  id: string;
  label: string;
}

export interface DiagramData {
  lanes: SwimLane[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

@Component({
  selector: 'app-policy-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IaChatComponent],
  templateUrl: './policy-editor.component.html',
  styleUrl: './policy-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PolicyEditorComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private svc     = inject(PolicyService);

  @ViewChild('svgCanvas') svgRef!: ElementRef<SVGSVGElement>;

  // ---------- layout constants ----------
  readonly LANE_H       = 160;   // horizontal mode: lane height
  readonly LABEL_W      = 90;    // horizontal mode: left label column
  readonly CANVAS_W     = 1200;  // horizontal mode: canvas width
  readonly LANE_W_VERT  = 220;   // vertical mode: lane column width
  readonly CANVAS_H_VERT = 720;  // vertical mode: canvas height
  readonly LABEL_H_VERT = 44;    // vertical mode: top header height

  // ---------- policy ----------
  policy   = signal<Policy | null>(null);
  loading  = signal(true);
  saving   = signal(false);
  saveOk   = signal(false);

  // ---------- diagram ----------
  diagram  = signal<DiagramData>({ lanes: [], nodes: [], edges: [] });

  // ---------- selection ----------
  selNodeId = signal<string | null>(null);
  selEdgeId = signal<string | null>(null);

  // ---------- drag ----------
  private dragActive = false;
  private dragId     = '';
  private dragOx     = 0;
  private dragOy     = 0;

  // ---------- connect mode ----------
  connectMode = signal(false);
  connectSrc  = signal<string | null>(null);
  ghostEdge   = signal<{ x1:number; y1:number; x2:number; y2:number } | null>(null);

  // ---------- zoom ----------
  zoom     = signal(1);
  zoomPct  = () => Math.round(this.zoom() * 100);

  // ---------- panel ----------
  showPanel  = signal(true);
  showChat   = signal(false);

  // ---------- orientation ----------
  vertical   = signal(false);
  policyName = signal('');
  policyDesc = signal('');

  // ---------- computed ----------
  get svgH(): number {
    if (this.vertical()) return this.CANVAS_H_VERT;
    const laneH = this.diagram().lanes.length * this.LANE_H;
    // Expand if nodes go below the lane area
    const maxNodeY = this.diagram().nodes.reduce((m, n) => Math.max(m, n.y + 40), 0);
    return Math.max(laneH, maxNodeY + 60);
  }

  get svgW(): number {
    if (this.vertical()) return this.diagram().lanes.length * this.LANE_W_VERT;
    // Expand if nodes go beyond the fixed canvas width
    const maxNodeX = this.diagram().nodes.reduce((m, n) => Math.max(m, n.x + 80), 0);
    return Math.max(this.CANVAS_W, maxNodeX + 120);
  }

  get totalW() { return this.svgW; }

  // ---------- lifecycle ----------
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }

    this.svc.getById(id).subscribe({
      next: (p) => {
        this.policy.set(p);
        this.policyName.set(p.nombre);
        this.policyDesc.set(p.descripcion ?? '');
        if (p.diagramJson) {
          try { this.diagram.set(JSON.parse(p.diagramJson)); } catch { /* ignore parse errors */ }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // ======== Node geometry ========

  nodeSize(type: NodeType): { w: number; h: number } {
    switch (type) {
      case 'initial':  return { w: 20,  h: 20  };
      case 'activity': return { w: 140, h: 52  };
      case 'decision': return { w: 64,  h: 44  };
      case 'final':    return { w: 28,  h: 28  };
    }
  }

  /** Returns the SVG point on the node boundary in the direction of (tx, ty). */
  connectPt(n: DiagramNode, tx: number, ty: number): { x: number; y: number } {
    const dx = tx - n.x;
    const dy = ty - n.y;
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    if (n.type === 'initial') {
      return { x: n.x + 10 * cos, y: n.y + 10 * sin };
    }
    if (n.type === 'final') {
      return { x: n.x + 14 * cos, y: n.y + 14 * sin };
    }
    if (n.type === 'activity') {
      const hw = 70, hh = 26;
      const absCos = Math.abs(cos), absSin = Math.abs(sin);
      const t = (absCos > 0 && absSin > 0)
        ? Math.min(hw / absCos, hh / absSin)
        : absCos > 0 ? hw / absCos : hh / absSin;
      return { x: n.x + t * cos, y: n.y + t * sin };
    }
    // decision diamond: |x/32| + |y/22| = 1
    {
      const a = 32, b = 22;
      const k = 1 / (Math.abs(cos) / a + Math.abs(sin) / b + 1e-9);
      return { x: n.x + k * cos, y: n.y + k * sin };
    }
  }

  diamondPts(n: DiagramNode): string {
    return `${n.x},${n.y - 22} ${n.x + 32},${n.y} ${n.x},${n.y + 22} ${n.x - 32},${n.y}`;
  }

  /** Wrap activity label at ~18 chars per line. */
  labelLines(label: string): string[] {
    if (!label) return [''];
    const words = label.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > 18 && cur) { lines.push(cur); cur = w; }
      else cur = cur ? cur + ' ' + w : w;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }

  edgePath(edge: DiagramEdge): string {
    const from = this.diagram().nodes.find(n => n.id === edge.fromId);
    const to   = this.diagram().nodes.find(n => n.id === edge.toId);
    if (!from || !to) return '';

    const s = this.connectPt(from, to.x,   to.y);
    const e = this.connectPt(to,   from.x, from.y);
    const cp1x = s.x + (e.x - s.x) * 0.45;
    const cp2x = e.x - (e.x - s.x) * 0.45;
    return `M ${s.x} ${s.y} C ${cp1x} ${s.y}, ${cp2x} ${e.y}, ${e.x} ${e.y}`;
  }

  edgeLabelPt(edge: DiagramEdge): { x: number; y: number } | null {
    if (!edge.label) return null;
    const from = this.diagram().nodes.find(n => n.id === edge.fromId);
    const to   = this.diagram().nodes.find(n => n.id === edge.toId);
    if (!from || !to) return null;
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 10 };
  }

  laneColor(i: number): string {
    const colors = ['rgba(248,168,185,0.04)', 'rgba(255,255,255,0)', 'rgba(226,231,176,0.06)', 'rgba(248,168,185,0.04)'];
    return colors[i % colors.length];
  }

  // ======== Toolbar actions ========

  addNode(type: NodeType): void {
    const d  = this.diagram();
    const li = Math.floor(d.lanes.length / 2);
    let x: number, y: number;

    if (this.vertical()) {
      x = li * this.LANE_W_VERT + this.LANE_W_VERT / 2;
      y = this.LABEL_H_VERT + 90 + d.nodes.length * 30;
      y = Math.min(y, this.CANVAS_H_VERT - 50);
    } else {
      x = this.LABEL_W + 200 + d.nodes.length * 25;
      x = Math.min(x, this.CANVAS_W - 100);
      y = li * this.LANE_H + this.LANE_H / 2;
    }

    const node: DiagramNode = {
      id: `n${Date.now()}`,
      type,
      label: type === 'activity' ? 'Nueva Actividad' : type === 'decision' ? '¿Condición?' : '',
      x, y
    };
    this.diagram.update(d2 => ({ ...d2, nodes: [...d2.nodes, node] }));
    this.selNodeId.set(node.id);
    this.selEdgeId.set(null);
  }

  addLane(): void {
    const lane: SwimLane = { id: `l${Date.now()}`, label: 'Nuevo Carril' };
    this.diagram.update(d => ({ ...d, lanes: [...d.lanes, lane] }));
  }

  deleteSelected(): void {
    const nid = this.selNodeId();
    const eid = this.selEdgeId();
    if (nid) {
      this.diagram.update(d => ({
        ...d,
        nodes: d.nodes.filter(n => n.id !== nid),
        edges: d.edges.filter(e => e.fromId !== nid && e.toId !== nid)
      }));
      this.selNodeId.set(null);
    } else if (eid) {
      this.diagram.update(d => ({ ...d, edges: d.edges.filter(e => e.id !== eid) }));
      this.selEdgeId.set(null);
    }
  }

  // ======== Mouse: drag ========

  onNodeMd(evt: MouseEvent, nodeId: string): void {
    if (this.connectMode()) { this.handleConnect(nodeId); return; }
    evt.preventDefault();
    evt.stopPropagation();
    this.dragActive = true;
    this.dragId     = nodeId;
    this.selNodeId.set(nodeId);
    this.selEdgeId.set(null);
    const n   = this.diagram().nodes.find(x => x.id === nodeId)!;
    const pt  = this.svgPoint(evt);
    this.dragOx = pt.x - n.x;
    this.dragOy = pt.y - n.y;
  }

  onSvgMm(evt: MouseEvent): void {
    const pt = this.svgPoint(evt);
    if (this.dragActive && this.dragId) {
      const minX = this.vertical() ? 15 : this.LABEL_W + 15;
      const newX = Math.max(minX, Math.min(this.svgW - 15, pt.x - this.dragOx));
      const minY = this.vertical() ? this.LABEL_H_VERT + 15 : 15;
      const newY = Math.max(minY, Math.min(this.svgH - 15, pt.y - this.dragOy));
      this.diagram.update(d => ({
        ...d, nodes: d.nodes.map(n => n.id === this.dragId ? { ...n, x: newX, y: newY } : n)
      }));
    }
    if (this.connectMode() && this.connectSrc()) {
      const src = this.diagram().nodes.find(n => n.id === this.connectSrc());
      if (src) {
        const s = this.connectPt(src, pt.x, pt.y);
        this.ghostEdge.set({ x1: s.x, y1: s.y, x2: pt.x, y2: pt.y });
      }
    }
  }

  onSvgMu(): void { this.dragActive = false; this.dragId = ''; }

  onSvgClick(evt: MouseEvent): void {
    if ((evt.target as Element).closest('.node-group, .edge-path')) return;
    if (!this.connectMode()) { this.selNodeId.set(null); this.selEdgeId.set(null); }
  }

  onEdgeClick(evt: MouseEvent, id: string): void {
    evt.stopPropagation();
    this.selEdgeId.set(id);
    this.selNodeId.set(null);
  }

  private svgPoint(evt: MouseEvent): { x: number; y: number } {
    const rect = this.svgRef?.nativeElement.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (evt.clientX - rect.left) / this.zoom(), y: (evt.clientY - rect.top) / this.zoom() };
  }

  // ======== Connect mode ========

  toggleConnect(): void {
    this.connectMode.update(v => !v);
    if (!this.connectMode()) { this.connectSrc.set(null); this.ghostEdge.set(null); }
  }

  private handleConnect(nodeId: string): void {
    const src = this.connectSrc();
    if (!src) { this.connectSrc.set(nodeId); return; }
    if (src === nodeId) return;
    const duplicate = this.diagram().edges.some(e => e.fromId === src && e.toId === nodeId);
    if (!duplicate) {
      this.diagram.update(d => ({
        ...d, edges: [...d.edges, { id: `e${Date.now()}`, fromId: src, toId: nodeId }]
      }));
    }
    this.connectSrc.set(null);
    this.ghostEdge.set(null);
  }

  // ======== Zoom ========

  zoomIn()    { this.zoom.update(z => +(Math.min(2,   z + 0.1)).toFixed(1)); }
  zoomOut()   { this.zoom.update(z => +(Math.max(0.3, z - 0.1)).toFixed(1)); }
  zoomReset() { this.zoom.set(1); }

  // ======== Save / Publish ========

  saveDraft(): void    { this.save(false); }
  publishChanges(): void { this.save(true); }

  private save(activate: boolean): void {
    const p = this.policy();
    if (!p?.id) return;
    this.saving.set(true);
    const updated: Policy = {
      ...p,
      nombre:      this.policyName(),
      descripcion: this.policyDesc(),
      activa:      activate ? true : p.activa,
      diagramJson: JSON.stringify(this.diagram())
    };
    this.svc.update(p.id, updated).subscribe({
      next: (res) => {
        this.policy.set(res);
        this.saving.set(false);
        this.saveOk.set(true);
        setTimeout(() => this.saveOk.set(false), 2000);
      },
      error: () => this.saving.set(false)
    });
  }

  onIaApply(newDiagram: DiagramData): void {
    this.diagram.set(newDiagram);
    this.showChat.set(false);
  }

  exportSvg(): void {
    const svg = this.svgRef?.nativeElement;
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${this.policyName() || 'diagrama'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  goBack(): void { this.router.navigate(['/politicas']); }

  // ======== Keyboard ========

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Delete' || (e.key === 'Backspace' && !['INPUT','TEXTAREA'].includes(tag))) {
      this.deleteSelected();
    }
    if (e.key === 'Escape') { this.connectMode.set(false); this.connectSrc.set(null); this.ghostEdge.set(null); }
    if (e.key === '+' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.zoomIn(); }
    if (e.key === '-' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.zoomOut(); }
  }

  // ======== Selected node label editing ========

  getSelectedNode(): DiagramNode | null {
    const id = this.selNodeId();
    return id ? (this.diagram().nodes.find(n => n.id === id) ?? null) : null;
  }

  updateNodeLabel(id: string, label: string): void {
    this.diagram.update(d => ({ ...d, nodes: d.nodes.map(n => n.id === id ? { ...n, label } : n) }));
  }

  updateLaneLabel(id: string, label: string): void {
    this.diagram.update(d => ({ ...d, lanes: d.lanes.map(l => l.id === id ? { ...l, label } : l) }));
  }

  deleteLane(id: string): void {
    this.diagram.update(d => ({ ...d, lanes: d.lanes.filter(l => l.id !== id) }));
  }
}
