import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../../store/useStore';
import { saveDiagramAsHtml, loadDiagramFromHtml } from '../../utils/saveLoad';
import DisplaySettingsModal from './DisplaySettingsModal';
import CsvImportModal from './CsvImportModal';
import { exportAsPng, exportAsSvg } from '../../utils/exportImage';
import { exportAsJson, importFromJson } from '../../utils/exportJson';
import { downloadCsvTemplate, exportServerListAsCsv } from '../../utils/csvUtils';

// ---------------------------------------------------------------------------
// Reusable toolbar button
// ---------------------------------------------------------------------------
function ToolbarButton({
  onClick,
  disabled = false,
  title,
  children,
  danger = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        px-2 py-1 text-sm rounded transition-colors
        ${danger
          ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
          : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
        }
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
      `}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Separator
// ---------------------------------------------------------------------------
function Sep() {
  return <div className="w-px h-6 bg-gray-300 mx-1" />;
}

// ---------------------------------------------------------------------------
// Export dropdown menu item
// ---------------------------------------------------------------------------
function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Export dropdown
// ---------------------------------------------------------------------------
function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Close menu then run the action
  function run(fn: () => void | Promise<void>) {
    setOpen(false);
    Promise.resolve(fn()).catch(() => {
      // errors are surfaced via alert() inside each util
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="내보내기 / 가져오기"
        className="px-2 py-1 text-sm rounded transition-colors text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-1"
      >
        📤 Export ▾
      </button>

      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 py-1 min-w-[160px]">
          {/* Image exports */}
          <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            이미지
          </div>
          <MenuItem onClick={() => run(() => exportAsPng(1))}>📷 PNG (1x)</MenuItem>
          <MenuItem onClick={() => run(() => exportAsPng(2))}>📷 PNG (2x)</MenuItem>
          <MenuItem onClick={() => run(() => exportAsPng(4))}>📷 PNG (4x)</MenuItem>
          <MenuItem onClick={() => run(() => exportAsSvg())}>🖼 SVG</MenuItem>

          <div className="my-1 border-t border-gray-100" />

          {/* JSON */}
          <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            JSON
          </div>
          <MenuItem onClick={() => run(() => exportAsJson())}>⬇ JSON 내보내기</MenuItem>
          <MenuItem onClick={() => run(() => importFromJson())}>⬆ JSON 가져오기</MenuItem>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar Component
// ---------------------------------------------------------------------------
export default function Toolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showSettings, setShowSettings]     = useState(false);
  const [showCsvImport, setShowCsvImport]   = useState(false);

  const historyIndex = useStore((s) => s.historyIndex);
  const historyLength = useStore((s) => s.history.length);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const clearDiagram = useStore((s) => s.clearDiagram);
  const nodes = useStore((s) => s.nodes);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const hasContent = nodes.length > 0;

  // --- Handlers ---

  const handleUndo = useCallback(() => undo(), [undo]);
  const handleRedo = useCallback(() => redo(), [redo]);

  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut]);
  const handleFitView = useCallback(() => fitView({ duration: 300, padding: 0.2 }), [fitView]);

  const handleSaveHtml = useCallback(() => {
    saveDiagramAsHtml();
  }, []);

  const handleLoadHtml = useCallback(() => {
    loadDiagramFromHtml().catch((err) => {
      if (err instanceof Error) {
        alert(err.message);
      }
    });
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('모든 노드, 연결선, 존을 삭제하시겠습니까?')) {
      clearDiagram();
    }
  }, [clearDiagram]);

  // --- Render ---

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 select-none">
      {/* Left: Title */}
      <span className="font-bold text-gray-800 text-base tracking-tight mr-6">
        Infra Sketch
      </span>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-0.5 ml-auto">
        {/* Undo / Redo */}
        <ToolbarButton onClick={handleUndo} disabled={!canUndo} title="실행 취소 (Ctrl+Z)">
          ↩ Undo
        </ToolbarButton>
        <ToolbarButton onClick={handleRedo} disabled={!canRedo} title="다시 실행 (Ctrl+Shift+Z)">
          ↪ Redo
        </ToolbarButton>

        <Sep />

        {/* Zoom */}
        <ToolbarButton onClick={handleZoomIn} title="확대">
          + Zoom In
        </ToolbarButton>
        <ToolbarButton onClick={handleZoomOut} title="축소">
          - Zoom Out
        </ToolbarButton>
        <ToolbarButton onClick={handleFitView} title="전체 보기">
          ⊞ Fit
        </ToolbarButton>

        <Sep />

        {/* Save / Load */}
        <ToolbarButton onClick={handleSaveHtml} title="HTML로 저장">
          💾 Save
        </ToolbarButton>
        <ToolbarButton onClick={handleLoadHtml} title="HTML 불러오기">
          📂 Load
        </ToolbarButton>

        {/* Export dropdown (PNG / SVG / JSON) */}
        <ExportDropdown />

        <Sep />

        {/* CSV section */}
        <ToolbarButton onClick={() => downloadCsvTemplate()} title="CSV 양식 다운로드">
          📋 CSV 양식
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowCsvImport(true)} title="CSV 서버 목록 가져오기">
          ⬆ CSV 가져오기
        </ToolbarButton>
        <ToolbarButton onClick={() => exportServerListAsCsv()} disabled={!hasContent} title="서버 목록을 CSV로 내보내기">
          ⬇ CSV 내보내기
        </ToolbarButton>

        <Sep />

        <ToolbarButton onClick={() => setShowSettings(true)} title="표시 설정">
          ⚙ Settings
        </ToolbarButton>

        <Sep />

        {/* Clear */}
        <ToolbarButton
          onClick={handleClear}
          disabled={!hasContent}
          title="모두 삭제"
          danger
        >
          🗑️ Clear
        </ToolbarButton>
      </div>

      <DisplaySettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <CsvImportModal isOpen={showCsvImport} onClose={() => setShowCsvImport(false)} />
    </div>
  );
}
