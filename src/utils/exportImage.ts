import { toPng, toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { useStore } from '../store/useStore';

/**
 * Filter out React Flow UI overlays (minimap, controls, attribution)
 * so they don't appear in the exported image.
 */
function overlayFilter(node: Element): boolean {
  const classList = (node as HTMLElement)?.classList;
  if (!classList) return true;
  return (
    !classList.contains('react-flow__minimap') &&
    !classList.contains('react-flow__controls') &&
    !classList.contains('react-flow__attribution')
  );
}

function getFilename(ext: string): string {
  const name = useStore.getState().diagramName || 'infra-diagram';
  const date = new Date().toISOString().slice(0, 10);
  return `${name}-${date}.${ext}`;
}

const PADDING = 40;

/**
 * Calculate bounding box of all nodes to capture the full diagram.
 */
function getFullBounds(): { x: number; y: number; width: number; height: number } | null {
  const { nodes } = useStore.getState();
  if (nodes.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    // Absolute position (account for parent)
    let x = node.position.x;
    let y = node.position.y;
    let cur = node;
    while (cur.parentId) {
      const parent = nodes.find(n => n.id === cur.parentId);
      if (!parent) break;
      x += parent.position.x;
      y += parent.position.y;
      cur = parent;
    }

    const w = node.style?.width ?? 240;
    const h = node.style?.height ?? 200;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  return {
    x: minX - PADDING,
    y: minY - PADDING,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
  };
}

/**
 * Export full diagram by temporarily adjusting viewport transform.
 */
async function captureFullDiagram(
  format: 'png' | 'svg',
  scale: number = 2,
): Promise<string> {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) throw new Error('캔버스를 찾을 수 없습니다.');

  const bounds = getFullBounds();
  if (!bounds) throw new Error('노드가 없습니다.');

  // Save original transform
  const originalTransform = viewport.style.transform;

  // Set transform to show all nodes at scale 1
  viewport.style.transform = `translate(${-bounds.x}px, ${-bounds.y}px) scale(1)`;

  // Wait for repaint
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const options = {
      backgroundColor: '#f9fafb',
      filter: overlayFilter,
      width: bounds.width,
      height: bounds.height,
      style: {
        transform: `translate(${-bounds.x}px, ${-bounds.y}px) scale(1)`,
      },
      ...(format === 'png' ? { pixelRatio: scale } : {}),
    };

    if (format === 'png') {
      return await toPng(viewport, options);
    } else {
      return await toSvg(viewport, options);
    }
  } finally {
    // Restore original transform
    viewport.style.transform = originalTransform;
  }
}

/**
 * Export the full diagram as PNG.
 * @param scale - Resolution multiplier (1, 2, or 4)
 */
export async function exportAsPng(scale: number = 2): Promise<void> {
  try {
    const dataUrl = await captureFullDiagram('png', scale);
    saveAs(dataUrl, getFilename('png'));
  } catch (err) {
    console.error('PNG 내보내기 실패:', err);
    alert(err instanceof Error ? err.message : 'PNG 내보내기 중 오류가 발생했습니다.');
  }
}

/**
 * Export the full diagram as SVG.
 */
export async function exportAsSvg(): Promise<void> {
  try {
    const dataUrl = await captureFullDiagram('svg');
    saveAs(dataUrl, getFilename('svg'));
  } catch (err) {
    console.error('SVG 내보내기 실패:', err);
    alert(err instanceof Error ? err.message : 'SVG 내보내기 중 오류가 발생했습니다.');
  }
}
