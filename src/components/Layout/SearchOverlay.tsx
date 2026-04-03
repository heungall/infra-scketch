import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../../store/useStore';
import type { InfraNode } from '../../types';

// ---------------------------------------------------------------------------
// Helper — check whether a node matches a search query string
// ---------------------------------------------------------------------------
export function nodeMatchesQuery(node: InfraNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const d = node.data;
  return (
    d.label.toLowerCase().includes(q) ||
    d.hostname.toLowerCase().includes(q) ||
    d.ip.some((ip) => ip.toLowerCase().includes(q)) ||
    d.os.toLowerCase().includes(q) ||
    (d.services ?? []).some(s => s.name.toLowerCase().includes(q) || s.port.includes(q) || (s.sid ?? '').toLowerCase().includes(q)) ||
    d.role.toLowerCase().includes(q) ||
    d.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

// ---------------------------------------------------------------------------
// SearchOverlay
// ---------------------------------------------------------------------------
export default function SearchOverlay() {
  const { fitView } = useReactFlow();

  const searchQuery  = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setShowSearch  = useStore((s) => s.setShowSearch);
  const nodes          = useStore((s) => s.nodes);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when overlay opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // --- Compute matching node IDs ---
  const matchingIds: string[] = searchQuery.trim()
    ? nodes
        .filter((n) => nodeMatchesQuery(n, searchQuery))
        .map((n) => n.id)
    : [];

  // --- Navigation state (which match is currently focused) ---
  const [matchIndex, setMatchIndex] = useState(0);

  // Reset navigation index when query or matches change
  useEffect(() => {
    setMatchIndex(0);
  }, [searchQuery]);

  // Fit view to current match whenever matchIndex or matchingIds changes
  useEffect(() => {
    if (matchingIds.length === 0) return;
    const idx = Math.min(matchIndex, matchingIds.length - 1);
    fitView({
      nodes: [{ id: matchingIds[idx] }],
      duration: 350,
      padding: 0.4,
      maxZoom: 1.5,
    });
  }, [matchIndex, matchingIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setShowSearch(false);
  }, [setSearchQuery, setShowSearch]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    inputRef.current?.focus();
  }, [setSearchQuery]);

  const handlePrev = useCallback(() => {
    if (matchingIds.length === 0) return;
    setMatchIndex((i) => (i - 1 + matchingIds.length) % matchingIds.length);
  }, [matchingIds.length]);

  const handleNext = useCallback(() => {
    if (matchingIds.length === 0) return;
    setMatchIndex((i) => (i + 1) % matchingIds.length);
  }, [matchingIds.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
        e.preventDefault();
      }
    },
    [handleClose, handlePrev, handleNext],
  );

  const isActive = searchQuery.trim().length > 0;
  const matchCount = matchingIds.length;
  const currentMatch = isActive && matchCount > 0 ? Math.min(matchIndex, matchCount - 1) + 1 : 0;

  return (
    <div
      className="
        absolute top-3 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-1
        bg-white border border-gray-200 rounded-xl shadow-lg
        px-3 py-2
        min-w-[320px]
      "
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Search icon */}
      <svg
        className="w-4 h-4 text-gray-400 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        />
      </svg>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="노드 검색 (호스트명, IP, OS, 태그...)"
        className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400 min-w-0"
      />

      {/* Match count */}
      {isActive && (
        <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded font-medium ${
          matchCount > 0
            ? 'text-blue-600 bg-blue-50'
            : 'text-red-500 bg-red-50'
        }`}>
          {matchCount > 0 ? `${currentMatch}/${matchCount}개 일치` : '일치 없음'}
        </span>
      )}

      {/* Navigation arrows */}
      {isActive && matchCount > 0 && (
        <>
          <button
            onClick={handlePrev}
            title="이전 일치 노드 (Shift+Enter)"
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            title="다음 일치 노드 (Enter)"
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </>
      )}

      {/* Clear button */}
      {searchQuery.length > 0 && (
        <button
          onClick={handleClear}
          title="검색어 지우기"
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        title="닫기 (Esc)"
        className="ml-1 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
