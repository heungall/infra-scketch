import PF from 'pathfinding';
import type { InfraNode } from '../types';

const CELL = 10;      // grid cell size (px)
const PAD  = 15;      // padding around nodes

interface Rect { x: number; y: number; w: number; h: number }

/** Get absolute bounding rect for a node (handles parent-relative positions) */
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
  const h = node.style?.height ?? 100;
  return { x, y, w, h };
}

/**
 * Compute an obstacle-avoiding orthogonal SVG path between two points.
 * Returns an SVG path string like "M 0 0 L 50 0 L 50 80 L 100 80".
 */
export function computeAvoidingPath(
  sx: number, sy: number,
  tx: number, ty: number,
  sourceNodeId: string,
  targetNodeId: string,
  allNodes: InfraNode[],
): string {
  // Fallback: direct step path
  const fallback = `M ${sx} ${sy} L ${sx} ${(sy + ty) / 2} L ${tx} ${(sy + ty) / 2} L ${tx} ${ty}`;

  if (allNodes.length === 0) return fallback;

  // Collect obstacle rects (exclude source/target nodes)
  const obstacles: Rect[] = [];
  for (const n of allNodes) {
    if (n.id === sourceNodeId || n.id === targetNodeId) continue;
    // Only consider server nodes as obstacles (not containers)
    if (n.type === 'containerNode') continue;
    obstacles.push(getNodeRect(n, allNodes));
  }

  if (obstacles.length === 0) return fallback;

  // Determine grid bounds from all points
  const allX = [sx, tx, ...obstacles.flatMap(r => [r.x - PAD, r.x + r.w + PAD])];
  const allY = [sy, ty, ...obstacles.flatMap(r => [r.y - PAD, r.y + r.h + PAD])];
  const minX = Math.min(...allX) - PAD * 2;
  const minY = Math.min(...allY) - PAD * 2;
  const maxX = Math.max(...allX) + PAD * 2;
  const maxY = Math.max(...allY) + PAD * 2;

  const cols = Math.ceil((maxX - minX) / CELL);
  const rows = Math.ceil((maxY - minY) / CELL);

  // Safety: don't create huge grids
  if (cols > 500 || rows > 500 || cols * rows > 120000) return fallback;

  const grid = new PF.Grid(cols, rows);

  // Mark obstacle cells as unwalkable
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

  // Convert source/target to grid coords
  const gsx = Math.max(0, Math.min(cols - 1, Math.round((sx - minX) / CELL)));
  const gsy = Math.max(0, Math.min(rows - 1, Math.round((sy - minY) / CELL)));
  const gtx = Math.max(0, Math.min(cols - 1, Math.round((tx - minX) / CELL)));
  const gty = Math.max(0, Math.min(rows - 1, Math.round((ty - minY) / CELL)));

  // Ensure start/end are walkable
  grid.setWalkableAt(gsx, gsy, true);
  grid.setWalkableAt(gtx, gty, true);

  try {
    const finder = new PF.OrthogonalJumpPointFinder({
      heuristic: PF.Heuristic.manhattan,
    });
    const path = finder.findPath(gsx, gsy, gtx, gty, grid);

    if (path.length < 2) return fallback;

    // Simplify: compress into orthogonal segments (remove collinear points)
    const smoothed = PF.Util.compressPath(path);

    // Convert grid coords back to canvas coords
    const points = smoothed.map(([gx, gy]) => ({
      x: gx * CELL + minX,
      y: gy * CELL + minY,
    }));

    // Force exact start/end points
    points[0] = { x: sx, y: sy };
    points[points.length - 1] = { x: tx, y: ty };

    // Build SVG path
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  } catch {
    return fallback;
  }
}
