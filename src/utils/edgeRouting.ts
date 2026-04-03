import type { InfraNode } from '../types';
import { useStore } from '../store/useStore';

const CELL = 8;
const PAD  = 10;

interface Rect { x: number; y: number; w: number; h: number }
interface Pt   { x: number; y: number }

// ── Node rect estimation ─────────────────────────────────────────────────────

function estimateNodeHeight(node: InfraNode): number {
  const ds = useStore.getState().displaySettings;
  const d = node.data;
  if (node.style?.height) return node.style.height;

  let h = 30;
  if (ds.showHostname && d.hostname) h += 24;
  h += (d.ip?.filter(Boolean).length ?? 0) * (ds.showIp ? 18 : 0);
  h += ((d.services ?? []).length) * (ds.showServices ? 26 : 0);
  if (ds.showEnv && d.env) h += 18;
  if (ds.showCpuMemory && d.cpu_memory) h += 18;
  if (ds.showRole && d.role) h += 18;
  if (ds.showTags && d.tags?.filter(Boolean).length) h += 22;
  if (ds.showOs && d.os) h += 26;
  return Math.max(h, 50);
}

function getNodeRect(node: InfraNode, allNodes: InfraNode[]): Rect {
  let x = node.position.x;
  let y = node.position.y;
  let cur: InfraNode | undefined = node;
  while (cur?.parentId) {
    const parent = allNodes.find(n => n.id === cur!.parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    cur = parent;
  }
  return { x, y, w: node.style?.width ?? 200, h: estimateNodeHeight(node) };
}

// ── Simple A* (orthogonal only) ──────────────────────────────────────────────

function astar(
  grid: Uint8Array, cols: number, rows: number,
  sx: number, sy: number, tx: number, ty: number,
): number[][] | null {
  const key = (x: number, y: number) => y * cols + x;
  const open = new Map<number, { x: number; y: number; g: number; f: number }>();
  const closed = new Set<number>();
  const parent = new Map<number, number>();

  const h = (x: number, y: number) => Math.abs(x - tx) + Math.abs(y - ty);
  const startKey = key(sx, sy);
  open.set(startKey, { x: sx, y: sy, g: 0, f: h(sx, sy) });

  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  while (open.size > 0) {
    // Pick node with lowest f
    let bestKey = -1;
    let bestF = Infinity;
    for (const [k, v] of open) {
      if (v.f < bestF) { bestF = v.f; bestKey = k; }
    }
    const cur = open.get(bestKey)!;
    open.delete(bestKey);
    closed.add(bestKey);

    if (cur.x === tx && cur.y === ty) {
      // Reconstruct path
      const path: number[][] = [];
      let k = key(tx, ty);
      while (k !== undefined) {
        const py = Math.floor(k / cols);
        const px = k % cols;
        path.unshift([px, py]);
        k = parent.get(k)!;
        if (k === startKey) { path.unshift([sx, sy]); break; }
      }
      return path;
    }

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      if (grid[nk] === 1) continue; // obstacle

      const ng = cur.g + 1;
      const existing = open.get(nk);
      if (existing && existing.g <= ng) continue;

      parent.set(nk, bestKey);
      open.set(nk, { x: nx, y: ny, g: ng, f: ng + h(nx, ny) });
    }

    // Safety: don't search forever
    if (closed.size > 80000) return null;
  }
  return null;
}

/** Compress path: remove collinear points */
function compress(path: number[][]): number[][] {
  if (path.length <= 2) return path;
  const result = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const [px, py] = path[i - 1];
    const [cx, cy] = path[i];
    const [nx, ny] = path[i + 1];
    // Keep only turning points
    if ((cx - px !== nx - cx) || (cy - py !== ny - cy)) {
      result.push(path[i]);
    }
  }
  result.push(path[path.length - 1]);
  return result;
}

// ── Main export ──────────────────────────────────────────────────────────────

export function computeAvoidingPath(
  sx: number, sy: number,
  tx: number, ty: number,
  sourceNodeId: string,
  targetNodeId: string,
  allNodes: InfraNode[],
): string {
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;
  const fallback = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;

  // Collect obstacles (exclude source/target — handles are at the node boundary)
  const obstacles: Rect[] = [];
  for (const n of allNodes) {
    if (n.id === sourceNodeId || n.id === targetNodeId) continue;
    if (n.type === 'containerNode') continue;
    obstacles.push(getNodeRect(n, allNodes));
  }

  if (obstacles.length === 0) return fallback;

  // Build grid
  const allX = [sx, tx, ...obstacles.flatMap(r => [r.x - PAD * 2, r.x + r.w + PAD * 2])];
  const allY = [sy, ty, ...obstacles.flatMap(r => [r.y - PAD * 2, r.y + r.h + PAD * 2])];
  const minX = Math.min(...allX) - PAD;
  const minY = Math.min(...allY) - PAD;
  const maxX = Math.max(...allX) + PAD;
  const maxY = Math.max(...allY) + PAD;

  const cols = Math.ceil((maxX - minX) / CELL);
  const rows = Math.ceil((maxY - minY) / CELL);

  if (cols > 500 || rows > 500) return fallback;

  const grid = new Uint8Array(cols * rows); // 0=walkable, 1=obstacle

  for (const r of obstacles) {
    const x0 = Math.max(0, Math.floor((r.x - PAD - minX) / CELL));
    const y0 = Math.max(0, Math.floor((r.y - PAD - minY) / CELL));
    const x1 = Math.min(cols - 1, Math.ceil((r.x + r.w + PAD - minX) / CELL));
    const y1 = Math.min(rows - 1, Math.ceil((r.y + r.h + PAD - minY) / CELL));
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        grid[gy * cols + gx] = 1;
      }
    }
  }

  const gsx = Math.max(0, Math.min(cols - 1, Math.round((sx - minX) / CELL)));
  const gsy = Math.max(0, Math.min(rows - 1, Math.round((sy - minY) / CELL)));
  const gtx = Math.max(0, Math.min(cols - 1, Math.round((tx - minX) / CELL)));
  const gty = Math.max(0, Math.min(rows - 1, Math.round((ty - minY) / CELL)));

  // Clear start/end cells so pathfinder can enter/exit
  grid[gsy * cols + gsx] = 0;
  grid[gty * cols + gtx] = 0;

  const rawPath = astar(grid, cols, rows, gsx, gsy, gtx, gty);
  if (!rawPath || rawPath.length < 2) return fallback;

  const smoothed = compress(rawPath);

  const points: Pt[] = smoothed.map(([gx, gy]) => ({
    x: gx * CELL + minX,
    y: gy * CELL + minY,
  }));

  points[0] = { x: sx, y: sy };
  points[points.length - 1] = { x: tx, y: ty };

  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}
