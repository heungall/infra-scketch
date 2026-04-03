import { saveAs } from 'file-saver';
import { useStore } from '../store/useStore';
import type { DiagramData } from '../types';

function getFilename(): string {
  return `infra-diagram-${new Date().toISOString().slice(0, 10)}.json`;
}

/**
 * Export the current diagram state as a JSON file.
 */
export function exportAsJson(): void {
  const data = useStore.getState().exportDiagram();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  saveAs(blob, getFilename());
}

/**
 * Open a file picker, read the selected JSON file, and import it into the store.
 */
export function importFromJson(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (ev) => {
        try {
          const raw = ev.target?.result;
          if (typeof raw !== 'string') throw new Error('파일을 읽을 수 없습니다.');
          const data: DiagramData = JSON.parse(raw);
          useStore.getState().importDiagram(data);
          resolve();
        } catch (err) {
          console.error('JSON 가져오기 실패:', err);
          alert('JSON 파일을 파싱할 수 없습니다. 올바른 형식의 파일인지 확인하세요.');
          reject(err);
        }
      };

      reader.onerror = () => {
        const err = new Error('파일 읽기 오류');
        alert('파일을 읽는 중 오류가 발생했습니다.');
        reject(err);
      };

      reader.readAsText(file);
    };

    // Handle the case where the user cancels the file picker
    input.oncancel = () => reject(new Error('File picker cancelled'));

    input.click();
  });
}
