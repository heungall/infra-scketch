// ============================================================
// 서버 목록 패널 (F-60 ~ F-63)
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../../store/useStore';
import { NODE_TYPE_CONFIGS, isContainerVariant, CUSTOM_ICONS } from '../../types';
import { exportServerListAsCsv } from '../../utils/csvUtils';

// ---------------------------------------------------------------------------
// 환경 배지
// ---------------------------------------------------------------------------

function EnvBadge({ env }: { env: string }) {
  if (!env) return null;
  const colors: Record<string, string> = {
    PRD: 'bg-red-100 text-red-700',
    DEV: 'bg-blue-100 text-blue-700',
    STG: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[env] ?? 'bg-gray-100 text-gray-600'}`}>
      {env}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 노드 타입 배지
// ---------------------------------------------------------------------------

function TypeBadge({ variant }: { variant: string }) {
  const config = NODE_TYPE_CONFIGS.find(c => c.variant === variant);
  if (!config) return null;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 노드 아이콘
// ---------------------------------------------------------------------------

function NodeIcon({ variant, size = 16 }: { variant: string; size?: number }) {
  const customSrc = CUSTOM_ICONS[variant as keyof typeof CUSTOM_ICONS];
  if (customSrc) {
    return (
      <img
        src={customSrc}
        alt={variant}
        style={{ width: size, height: size, objectFit: 'contain' }}
        className="shrink-0"
      />
    );
  }
  const config = NODE_TYPE_CONFIGS.find(c => c.variant === variant);
  return (
    <span style={{ fontSize: size - 2, lineHeight: 1 }} className="shrink-0">
      {config?.icon ?? '📦'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 정렬 옵션
// ---------------------------------------------------------------------------

type SortKey = 'label' | 'type' | 'env';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'label', label: '이름 (A-Z)' },
  { value: 'type',  label: '유형' },
  { value: 'env',   label: '환경' },
];

// ---------------------------------------------------------------------------
// 메인 패널
// ---------------------------------------------------------------------------

export default function ServerListPanel() {
  const { fitView } = useReactFlow();
  const nodes      = useStore(s => s.nodes);
  const selectNode = useStore(s => s.selectNode);
  const selectedNodeIds = useStore(s => s.selectedNodeIds);

  const [search, setSearch]   = useState('');
  const [sortBy, setSortBy]   = useState<SortKey>('label');

  // 검색 필터
  const q = search.trim().toLowerCase();

  // 노드를 컨테이너(부모) 우선 정렬하여 계층 구조 표현
  const sortedNodes = useMemo(() => {
    const filtered = nodes.filter(node => {
      if (!q) return true;
      const d = node.data;
      return (
        d.label.toLowerCase().includes(q) ||
        d.hostname.toLowerCase().includes(q) ||
        d.ip.some(ip => ip.toLowerCase().includes(q))
      );
    });

    filtered.sort((a, b) => {
      if (sortBy === 'label') {
        return a.data.label.localeCompare(b.data.label, 'ko');
      }
      if (sortBy === 'type') {
        const ta = a.data.nodeVariant;
        const tb = b.data.nodeVariant;
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      }
      if (sortBy === 'env') {
        const ea = a.data.env || 'ZZZ';
        const eb = b.data.env || 'ZZZ';
        return ea < eb ? -1 : ea > eb ? 1 : 0;
      }
      return 0;
    });

    return filtered;
  }, [nodes, q, sortBy]);

  // 컨테이너 노드와 자식 노드를 구분
  const containerIds = useMemo(() => new Set(nodes.filter(n => isContainerVariant(n.data.nodeVariant)).map(n => n.id)), [nodes]);

  const handleRowClick = useCallback((nodeId: string) => {
    selectNode(nodeId);
    // 비동기로 fitView 호출 (React Flow 상태 반영 후)
    setTimeout(() => {
      fitView({ nodes: [{ id: nodeId }], duration: 500, padding: 0.5 });
    }, 50);
  }, [selectNode, fitView]);

  const handleExportCsv = useCallback(() => {
    exportServerListAsCsv();
  }, []);

  return (
    <div className="flex flex-col h-full select-none">
      {/* 헤더 */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            서버 목록
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              ({sortedNodes.length}개{q && ` / 전체 ${nodes.length}개`})
            </span>
          </span>
          <button
            onClick={handleExportCsv}
            disabled={nodes.length === 0}
            title="CSV로 내보내기"
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
          >
            CSV 내보내기
          </button>
        </div>

        {/* 검색 */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름 / 호스트명 / IP 검색..."
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
        />

        {/* 정렬 */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] text-gray-400">정렬:</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                sortBy === opt.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {sortedNodes.length === 0 && (
          <div className="text-xs text-gray-400 text-center mt-8 px-4">
            {q ? '검색 결과가 없습니다.' : '노드가 없습니다.\n좌측 팔레트에서 노드를 추가하세요.'}
          </div>
        )}

        {sortedNodes.map(node => {
          const d = node.data;
          const isContainer = containerIds.has(node.id);
          const hasParent = !!node.parentId;
          const isSelected = selectedNodeIds.includes(node.id);
          const firstIp = d.ip.find(Boolean) ?? '';

          return (
            <button
              key={node.id}
              onClick={() => handleRowClick(node.id)}
              title={`${d.label}\n${d.hostname}\n${d.ip.join(', ')}`}
              className={`
                w-full text-left px-3 py-2 border-b border-gray-100 transition-colors
                ${isSelected
                  ? 'bg-blue-50 border-l-2 border-l-blue-500'
                  : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                }
              `}
            >
              <div className={`flex items-start gap-2 ${hasParent ? 'pl-3' : ''}`}>
                {/* 아이콘 */}
                <div className="shrink-0 mt-0.5">
                  <NodeIcon variant={d.nodeVariant} size={14} />
                </div>

                {/* 텍스트 영역 */}
                <div className="flex-1 min-w-0">
                  {/* 첫째 줄: 서버명 + 배지들 */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`text-xs font-medium truncate max-w-[120px] ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {d.label || '(이름 없음)'}
                    </span>
                    <TypeBadge variant={d.nodeVariant} />
                    {d.env && <EnvBadge env={d.env} />}
                  </div>

                  {/* 둘째 줄: 호스트명 */}
                  {d.hostname && (
                    <div className="text-[10px] text-gray-500 truncate mt-0.5">
                      {d.hostname}
                    </div>
                  )}

                  {/* 셋째 줄: IP */}
                  {firstIp && (
                    <div className="text-[10px] text-gray-400 font-mono truncate">
                      {firstIp}
                      {d.ip.filter(Boolean).length > 1 && (
                        <span className="ml-0.5 text-gray-300">
                          +{d.ip.filter(Boolean).length - 1}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 컨테이너 표시 */}
                  {isContainer && (
                    <div className="text-[10px] text-blue-400 mt-0.5">
                      컨테이너 노드
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
