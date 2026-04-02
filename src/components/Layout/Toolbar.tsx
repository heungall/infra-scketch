import { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../../store/useStore';
import DisplaySettingsModal from './DisplaySettingsModal';

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
// Toolbar Component
// ---------------------------------------------------------------------------
export default function Toolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showSettings, setShowSettings] = useState(false);

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
    alert('HTML 저장 기능은 추후 구현됩니다.');
  }, []);

  const handleLoadHtml = useCallback(() => {
    alert('HTML 불러오기 기능은 추후 구현됩니다.');
  }, []);

  const handleExportPng = useCallback(() => {
    alert('PNG 내보내기 기능은 추후 구현됩니다.');
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

        {/* Save / Load / Export */}
        <ToolbarButton onClick={handleSaveHtml} title="HTML로 저장">
          💾 Save
        </ToolbarButton>
        <ToolbarButton onClick={handleLoadHtml} title="HTML 불러오기">
          📂 Load
        </ToolbarButton>
        <ToolbarButton onClick={handleExportPng} title="PNG로 내보내기">
          📷 PNG
        </ToolbarButton>
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
    </div>
  );
}
