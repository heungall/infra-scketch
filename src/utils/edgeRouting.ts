import type { InfraNode } from '../types';

const STUB = 10;

interface Pt { x: number; y: number }

// ── Handle direction ────────────────────────────────────────────────────────

function handleDir(handleId: string): Pt | null {
  if (!handleId) return null;
  if (handleId.includes('top'))    return { x: 0, y: -1 };
  if (handleId.includes('bottom')) return { x: 0, y: 1 };
  if (handleId.includes('left'))   return { x: -1, y: 0 };
  if (handleId.includes('right'))  return { x: 1, y: 0 };
  return null;
}

// ── Main export ─────────────────────────────────────────────────────────────

export function computeAvoidingPath(
  sx: number, sy: number,
  tx: number, ty: number,
  _sourceNodeId: string,
  _targetNodeId: string,
  _allNodes: InfraNode[],
  sourceHandleId?: string,
  targetHandleId?: string,
): string {
  const srcDir = handleDir(sourceHandleId ?? '');
  const tgtDir = handleDir(targetHandleId ?? '');

  const points: Pt[] = [];

  // 1) 출발점
  points.push({ x: sx, y: sy });

  // 2) 소스 스텁
  const s = srcDir
    ? { x: sx + srcDir.x * STUB, y: sy + srcDir.y * STUB }
    : null;
  if (s) points.push(s);

  // 3) 타겟 스텁
  const t = tgtDir
    ? { x: tx + tgtDir.x * STUB, y: ty + tgtDir.y * STUB }
    : null;

  // 4) 스텁 끝점 사이를 직각으로 연결
  const fromX = s ? s.x : sx;
  const fromY = s ? s.y : sy;
  const toX = t ? t.x : tx;
  const toY = t ? t.y : ty;

  if (fromX !== toX && fromY !== toY) {
    // 수평/수직 어느 방향을 먼저 갈지 결정
    if (srcDir && srcDir.x !== 0) {
      // 소스가 좌/우 → 수평 유지 후 수직
      points.push({ x: toX, y: fromY });
    } else if (srcDir && srcDir.y !== 0) {
      // 소스가 상/하 → 수직 유지 후 수평
      points.push({ x: fromX, y: toY });
    } else {
      // 기본: 중간점 경유
      const midX = (fromX + toX) / 2;
      points.push({ x: midX, y: fromY });
      points.push({ x: midX, y: toY });
    }
  }

  // 5) 타겟 스텁
  if (t) points.push(t);

  // 6) 도착점
  points.push({ x: tx, y: ty });

  // 중복 점 제거
  const deduped: Pt[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.abs(points[i].x - prev.x) > 0.5 || Math.abs(points[i].y - prev.y) > 0.5) {
      deduped.push(points[i]);
    }
  }

  return deduped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}
