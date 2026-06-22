import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../../store/useStore';
import { saveDiagramAsHtml, loadDiagramFromHtml } from '../../utils/saveLoad';
import DisplaySettingsModal from './DisplaySettingsModal';
import CsvImportModal from './CsvImportModal';
import HelpModal from './HelpModal';
import { exportAsPng, exportAsSvg } from '../../utils/exportImage';
import { exportAsJson, importFromJson } from '../../utils/exportJson';
import { downloadCsvTemplate, exportServerListAsCsv } from '../../utils/csvUtils';
import ServerSaveModal from './ServerSaveModal';
import type { Environment } from '../../types';

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
  const [showShortcuts, setShowShortcuts]   = useState(false);
  const [showServerSave, setShowServerSave] = useState(false);

  const diagramName = useStore((s) => s.diagramName);
  const setDiagramName = useStore((s) => s.setDiagramName);

  const historyIndex = useStore((s) => s.historyIndex);
  const historyLength = useStore((s) => s.history.length);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const clearDiagram = useStore((s) => s.clearDiagram);
  const nodes = useStore((s) => s.nodes);

  // Multi-select & alignment
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const alignSelectedNodes = useStore((s) => s.alignSelectedNodes);
  const multiSelected = selectedNodeIds.length >= 2;

  // Grid
  const gridEnabled = useStore((s) => s.gridEnabled);
  const toggleGrid = useStore((s) => s.toggleGrid);

  // Search / Filter
  const showSearch    = useStore((s) => s.showSearch);
  const setShowSearch = useStore((s) => s.setShowSearch);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const envFilter     = useStore((s) => s.envFilter);
  const setEnvFilter  = useStore((s) => s.setEnvFilter);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const hasContent = nodes.length > 0;

  // --- Keyboard shortcut: "?" opens shortcuts help ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '?' &&
        !(e.target as HTMLElement).matches('input, textarea, [contenteditable]')
      ) {
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
      {/* Left: Title + Board name */}
      <span className="font-bold text-gray-800 text-base tracking-tight mr-2 shrink-0">
        Infra Sketch
      </span>
      <span className="text-gray-400 mr-1 shrink-0">/</span>
      <input
        value={diagramName}
        onChange={(e) => setDiagramName(e.target.value)}
        placeholder="보드 이름 입력..."
        className="text-sm text-gray-700 font-medium bg-transparent border-b border-transparent
                   hover:border-gray-300 focus:border-blue-400 focus:outline-none
                   px-1 py-0.5 mr-4 min-w-[120px] max-w-[250px] truncate"
        title="보드 이름 (서버 저장 시 사용)"
      />

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

        {/* Grid */}
        <button
          onClick={toggleGrid}
          title={gridEnabled ? '그리드 끄기' : '그리드 켜기 (스냅)'}
          className={`
            px-2 py-1 text-sm rounded transition-colors
            ${gridEnabled
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
            }
          `}
        >
          # Grid
        </button>

        {/* Alignment (visible when 2+ nodes selected) */}
        {multiSelected && (
          <>
            <Sep />
            <span className="text-xs text-gray-400 mr-1">정렬:</span>
            <button onClick={() => alignSelectedNodes('left')} title="왼쪽 정렬" className="px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded">⫷</button>
            <button onClick={() => alignSelectedNodes('center')} title="가운데 정렬" className="px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded">⫿</button>
            <button onClick={() => alignSelectedNodes('right')} title="오른쪽 정렬" className="px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded">⫸</button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button onClick={() => alignSelectedNodes('top')} title="상단 정렬" className="px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded">▔</button>
            <button onClick={() => alignSelectedNodes('middle')} title="중앙 정렬" className="px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded">⊡</button>
            <button onClick={() => alignSelectedNodes('bottom')} title="하단 정렬" className="px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded">▁</button>
          </>
        )}

        <Sep />

        {/* Search toggle */}
        <button
          onClick={() => {
            if (showSearch) {
              setSearchQuery('');
              setShowSearch(false);
            } else {
              setSearchQuery('');
              setShowSearch(true);
            }
          }}
          title="노드 검색 (Ctrl+F)"
          className={`
            px-2 py-1 text-sm rounded transition-colors flex items-center gap-1
            ${showSearch
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
            }
          `}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          검색
        </button>

        {/* Environment filter */}
        <select
          value={envFilter}
          onChange={(e) => setEnvFilter(e.target.value as Environment | 'all')}
          title="운영 환경 필터"
          className={`
            px-2 py-1 text-sm rounded border transition-colors outline-none cursor-pointer
            ${envFilter !== 'all'
              ? 'border-blue-300 bg-blue-50 text-blue-700 font-medium'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <option value="all">전체 환경</option>
          <option value="PRD">PRD</option>
          <option value="DEV">DEV</option>
          <option value="STG">STG</option>
        </select>

        <Sep />

        {/* Server Save / Load — 로컬 개발(백엔드 구동 시)에서만 노출, 정적 배포 빌드에선 숨김 */}
        {import.meta.env.DEV && (
          <ToolbarButton onClick={() => setShowServerSave(true)} title="서버 저장/불러오기">
            🖥 Server
          </ToolbarButton>
        )}

        {/* Save / Load (HTML) */}
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

        {/* Help — always far right */}
        <Sep />
        <button
          onClick={() => setShowShortcuts(true)}
          title="키보드 단축키 도움말 (?)"
          className="w-7 h-7 flex items-center justify-center text-sm font-bold text-gray-500
                     rounded-full border border-gray-300 hover:bg-gray-100 hover:text-gray-700
                     active:bg-gray-200 transition-colors"
        >
          ?
        </button>
      </div>

      <DisplaySettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <CsvImportModal isOpen={showCsvImport} onClose={() => setShowCsvImport(false)} />
      <HelpModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      {import.meta.env.DEV && (
        <ServerSaveModal isOpen={showServerSave} onClose={() => setShowServerSave(false)} />
      )}
    </div>
  );
}
