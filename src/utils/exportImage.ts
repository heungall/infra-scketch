import { toPng, toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';

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
  return `infra-diagram-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

/**
 * Export the React Flow canvas as PNG.
 * @param scale - Resolution multiplier (1, 2, or 4)
 */
export async function exportAsPng(scale: number = 2): Promise<void> {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) {
    alert('캔버스를 찾을 수 없습니다.');
    return;
  }

  try {
    const dataUrl = await toPng(viewport, {
      backgroundColor: '#f9fafb',
      pixelRatio: scale,
      filter: overlayFilter,
    });
    saveAs(dataUrl, getFilename('png'));
  } catch (err) {
    console.error('PNG 내보내기 실패:', err);
    alert('PNG 내보내기 중 오류가 발생했습니다.');
  }
}

/**
 * Export the React Flow canvas as SVG.
 */
export async function exportAsSvg(): Promise<void> {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) {
    alert('캔버스를 찾을 수 없습니다.');
    return;
  }

  try {
    const dataUrl = await toSvg(viewport, {
      backgroundColor: '#f9fafb',
      filter: overlayFilter,
    });
    saveAs(dataUrl, getFilename('svg'));
  } catch (err) {
    console.error('SVG 내보내기 실패:', err);
    alert('SVG 내보내기 중 오류가 발생했습니다.');
  }
}
