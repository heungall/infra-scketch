import PF from 'pathfinding';
import type { InfraNode } from '../types';

const CELL = 10;
const PAD  = 20;

interface Rect { x: number; y: number; w: number; h: number }

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
  const w = node.style?.width ?? 180;
  const h = node.style?.height ?? 120;
  return { x, y, w, h };
}

function segmentsIntersectRect(
  x1: number, y1: number, x2: number, y2: number, r: Rect,
): boolean {
  const rx = r.x - PAD;
  const ry = r.y - PAD;
  const rw = r.w + PAD * 2;
  const rh = r.h + PAD * 2;

  // Horizontal segment
  if (y1 === y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    return y1 >= ry && y1 <= ry + rh && maxX >= rx && minX <= rx + rw;
  }
  // Vertical segment
  if (x1 === x2) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return x1 >= rx && x1 <= rx + rw && maxY >= ry && minY <= ry + rh;
  }
  return false;
}

export function computeAvoidingPath(
  sx: number, sy: number,
  tx: number, ty: number,
  sourceNodeId: string,
  targetNodeId: string,
  allNodes: InfraNode[],
): string {
  const midY = (sy + ty) / 2;
  const midX = (sx + tx) / 2;
  const fallbackH = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
  const fallbackV = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;

  // Collect obstacle rects (include source/target — line should not cross over them either)
  const obstacles: Rect[] = [];
  for (const n of allNodes) {
    if (n.type === 'containerNode') continue;
    obstacles.push(getNodeRect(n, allNodes));
  }

  if (obstacles.length === 0) return fallbackH;

  // Quick check: does the simple L-path intersect anything?
  const simpleHit = obstacles.some(r =>
    segmentsIntersectRect(sx, sy, midX, sy, r) ||
    segmentsIntersectRect(midX, sy, midX, ty, r) ||
    segmentsIntersectRect(midX, ty, tx, ty, r)
  );
  if (!simpleHit) return fallbackH;

  const simpleHitV = obstacles.some(r =>
    segmentsIntersectRect(sx, sy, sx, midY, r) ||
    segmentsIntersectRect(sx, midY, tx, midY, r) ||
    segmentsIntersectRect(tx, midY, tx, ty, r)
  );
  if (!simpleHitV) return fallbackV;

  // Need full pathfinding
  const allX = [sx, tx, ...obstacles.flatMap(r => [r.x - PAD, r.x + r.w + PAD])];
  const allY = [sy, ty, ...obstacles.flatMap(r => [r.y - PAD, r.y + r.h + PAD])];
  const minX = Math.min(...allX) - PAD * 3;
  const minY = Math.min(...allY) - PAD * 3;
  const maxX = Math.max(...allX) + PAD * 3;
  const maxY = Math.max(...allY) + PAD * 3;

  const cols = Math.ceil((maxX - minX) / CELL);
  const rows = Math.ceil((maxY - minY) / CELL);

  if (cols > 400 || rows > 400 || cols * rows > 100000) return fallbackH;

  const grid = new PF.Grid(cols, rows);

  for (const r of obstacles) {
    const x0 = Math.max(0, Math.floor((r.x - PAD - minX) / CELL));
    const y0 = Math.max(0, Math.floor((r.y - PAD - minY) / CELL));
    const x1 = Math.min(cols - 1, Math.ceil((r.x + r.w + PAD - minX) / CELL));
    const y1 = Math.min(rows - 1, Math.ceil((r.y + r.h + PAD - minY) / CELL));
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        grid.setWalkableAt(gx, gy, false);
      }
    }
  }

  const gsx = Math.max(0, Math.min(cols - 1, Math.round((sx - minX) / CELL)));
  const gsy = Math.max(0, Math.min(rows - 1, Math.round((sy - minY) / CELL)));
  const gtx = Math.max(0, Math.min(cols - 1, Math.round((tx - minX) / CELL)));
  const gty = Math.max(0, Math.min(rows - 1, Math.round((ty - minY) / CELL)));

  grid.setWalkableAt(gsx, gsy, true);
  grid.setWalkableAt(gtx, gty, true);

  try {
    // AStarFinder with no diagonal movement = orthogonal only
    const finder = new PF.AStarFinder({
      diagonalMovement: (PF as any).DiagonalMovement
        ? (PF as any).DiagonalMovement.Never
        : 0,
    });
    const rawPath = finder.findPath(gsx, gsy, gtx, gty, grid);

    if (rawPath.length < 2) return fallbackH;

    const smoothed = PF.Util.compressPath(rawPath);

    const points = smoothed.map(([gx, gy]) => ({
      x: gx * CELL + minX,
      y: gy * CELL + minY,
    }));

    points[0] = { x: sx, y: sy };
    points[points.length - 1] = { x: tx, y: ty };

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  } catch {
    return fallbackH;
  }
}
