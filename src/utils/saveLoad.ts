import { useStore } from '../store/useStore';

// ============================================================
// Auto-save (localStorage)
// ============================================================

const AUTOSAVE_KEY = 'infra-sketch-autosave';

/**
 * Persist current diagram to localStorage.
 */
export function autoSave(): void {
  try {
    const data = useStore.getState().exportDiagram();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or other storage error — silently ignore
  }
}

/**
 * Restore diagram from localStorage auto-save.
 * @returns true if data was loaded
 */
export function loadAutoSave(): boolean {
  const saved = localStorage.getItem(AUTOSAVE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      useStore.getState().importDiagram(data);
      return true;
    } catch {
      /* corrupted data — ignore */
    }
  }
  return false;
}

/**
 * Remove auto-save data from localStorage.
 */
export function clearAutoSave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

// ============================================================
// HTML Save
// ============================================================

/**
 * Save current diagram as a self-contained HTML file.
 *
 * Strategy:
 * 1. Get diagram data from store.exportDiagram()
 * 2. Clone the current document HTML
 * 3. Inject/update a <script id="infra-sketch-data" type="application/json"> with the diagram JSON
 * 4. Trigger download as .html file
 */
export function saveDiagramAsHtml(filename?: string): void {
  const data = useStore.getState().exportDiagram();
  const jsonStr = JSON.stringify(data);

  // Clone the current page HTML
  const html = document.documentElement.cloneNode(true) as HTMLElement;

  // Remove any existing data script
  const existingScript = html.querySelector('#infra-sketch-data');
  if (existingScript) existingScript.remove();

  // Create data script element
  const dataScript = document.createElement('script');
  dataScript.id = 'infra-sketch-data';
  dataScript.type = 'application/json';
  dataScript.textContent = jsonStr;

  // Insert before closing </body>
  const body = html.querySelector('body');
  body?.appendChild(dataScript);

  // Generate full HTML string
  const fullHtml = '<!DOCTYPE html>\n' + html.outerHTML;

  // Trigger download
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename || `infra-diagram-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// HTML Load (from file picker)
// ============================================================

/**
 * Open a file picker, read the selected HTML file, extract the embedded
 * diagram JSON, and import it into the store.
 */
export function loadDiagramFromHtml(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('파일이 선택되지 않았습니다.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const htmlStr = ev.target?.result as string;
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlStr, 'text/html');
          const dataEl = doc.getElementById('infra-sketch-data');

          if (!dataEl?.textContent) {
            throw new Error(
              '이 파일에 Infra Sketch 데이터가 없습니다.\n유효한 Infra Sketch HTML 파일을 선택하세요.',
            );
          }

          const data = JSON.parse(dataEl.textContent);
          useStore.getState().importDiagram(data);
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
      reader.readAsText(file);
    };

    // If the user cancels the file dialog, nothing fires — that's fine.
    input.click();
  });
}

// ============================================================
// Embedded data (on startup)
// ============================================================

/**
 * Check whether the current page contains an embedded diagram blob
 * (i.e. the page IS a previously-saved HTML file).
 * If so, import the data into the store.
 *
 * @returns true if embedded data was found and loaded
 */
export function loadEmbeddedDiagram(): boolean {
  const dataEl = document.getElementById('infra-sketch-data');
  if (dataEl?.textContent) {
    try {
      const data = JSON.parse(dataEl.textContent);
      useStore.getState().importDiagram(data);
      return true;
    } catch {
      console.warn('Failed to parse embedded Infra Sketch data');
    }
  }
  return false;
}
