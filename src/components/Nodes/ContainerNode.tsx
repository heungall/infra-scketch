import { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NODE_TYPE_CONFIGS, type ServerData } from '../../types';
import { useStore } from '../../store/useStore';

// ─── Types ───────────────────────────────────────────────────────────────────
type ContainerNodeType = Node<ServerData, 'containerNode'>;

// ─── Helper ──────────────────────────────────────────────────────────────────
function getConfig(variant: string) {
  return (
    NODE_TYPE_CONFIGS.find((c) => c.variant === variant) ?? NODE_TYPE_CONFIGS[0]
  );
}

const ENV_COLORS: Record<string, string> = {
  PRD: 'bg-red-100 text-red-700',
  DEV: 'bg-green-100 text-green-700',
  STG: 'bg-yellow-100 text-yellow-700',
};

// Convert hex color to rgba with given alpha
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(200,220,240,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Handle style (slightly larger than server node) ─────────────────────────
const handleStyle =
  'w-3 h-3 bg-gray-400 border-2 border-gray-500 rounded-full';

// ─── Resize minimum constraints ───────────────────────────────────────────────
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

// ─── Main component ───────────────────────────────────────────────────────────
function ContainerNode({ data, selected, id }: NodeProps<ContainerNodeType>) {
  const updateNode = useStore((s) => s.updateNode);
  const resizeContainer = useStore((s) => s.resizeContainer);
  const pushHistory = useStore((s) => s.pushHistory);

  const config = getConfig(data.nodeVariant);

  // ─── Inline label editing ─────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(data.label);
    setEditing(true);
  }, [data.label]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (editValue !== data.label) {
      updateNode(id, { label: editValue });
    }
  }, [editValue, data.label, id, updateNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') {
        setEditValue(data.label);
        setEditing(false);
      }
    },
    [commitEdit, data.label]
  );

  // ─── Resize handle logic ──────────────────────────────────────────────────
  // We need to read the current rendered size. React Flow sets width/height via
  // the node's style prop. We store the start dimensions on mousedown.
  const resizingRef = useRef(false);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const el = containerRef.current;
      const currentW = el ? el.offsetWidth : MIN_WIDTH;
      const currentH = el ? el.offsetHeight : MIN_HEIGHT;

      resizingRef.current = true;
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        w: currentW,
        h: currentH,
      };

      const onMouseMove = (mv: MouseEvent) => {
        if (!resizingRef.current) return;
        const dx = mv.clientX - resizeStartRef.current.mouseX;
        const dy = mv.clientY - resizeStartRef.current.mouseY;
        const newW = Math.max(MIN_WIDTH, resizeStartRef.current.w + dx);
        const newH = Math.max(MIN_HEIGHT, resizeStartRef.current.h + dy);
        resizeContainer(id, newW, newH);
      };

      const onMouseUp = () => {
        if (!resizingRef.current) return;
        resizingRef.current = false;
        pushHistory();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [id, resizeContainer, pushHistory]
  );

  // ─── Derived styles ───────────────────────────────────────────────────────
  const bgColor = hexToRgba(data.color || '#E3F2FD', 0.4);
  const borderColor = data.borderColor || '#1976D2';
  const borderStyle = selected ? 'solid' : 'dashed';

  const firstIp = data.ip?.[0];

  return (
    <>
      {/* Connection handles — 4 sides, slightly larger than server node */}
      <Handle type="target" position={Position.Top}    className={handleStyle} />
      <Handle type="source" position={Position.Bottom} className={handleStyle} />
      <Handle type="target" position={Position.Left}   className={handleStyle} />
      <Handle type="source" position={Position.Right}  className={handleStyle} />

      {/*
        Outer wrapper: fills 100% of the React Flow node dimensions (set via
        node.style.width / height in the store). pointer-events on the body
        area must remain 'auto' so React Flow can handle child interactions.
      */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-xl flex flex-col overflow-visible"
        style={{
          minWidth: MIN_WIDTH,
          minHeight: MIN_HEIGHT,
          background: bgColor,
          borderWidth: 2,
          borderStyle,
          borderColor,
          boxShadow: selected
            ? '0 0 0 2px #3B82F6, 0 4px 16px rgba(0,0,0,0.12)'
            : '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div
          className="nodrag nopan flex items-center gap-2 px-3 py-2 rounded-t-xl shrink-0 select-none"
          style={{ background: 'rgba(255,255,255,0.55)' }}
          onDoubleClick={startEdit}
        >
          {/* Icon */}
          <span className="text-base leading-none shrink-0">{config.icon}</span>

          {/* Label (editable on double-click) */}
          {editing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="nodrag nopan flex-1 text-sm font-bold text-gray-800 bg-white/80
                         border border-blue-400 rounded px-1 py-0.5 outline-none min-w-0"
            />
          ) : (
            <span
              className="flex-1 text-sm font-bold text-gray-800 truncate cursor-text"
              title="더블클릭하여 이름 편집"
            >
              {data.label || '(이름 없음)'}
            </span>
          )}

          {/* env badge */}
          {data.env && (
            <span
              className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                ENV_COLORS[data.env] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {data.env}
            </span>
          )}

          {/* hostname / IP badges (meaningful for vm/firewall) */}
          {data.hostname && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded
                             bg-white/70 text-gray-600 border border-gray-200 truncate max-w-[100px]">
              {data.hostname}
            </span>
          )}
          {firstIp && !data.hostname && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded
                             bg-blue-50 text-blue-700 border border-blue-200 font-mono">
              {firstIp}
            </span>
          )}
        </div>

        {/*
          Body: flex-1 so it fills remaining height.
          pointer-events: none here so child nodes inside the container receive
          mouse events normally from React Flow. The container itself is still
          draggable via the header or the node selection box.
        */}
        <div
          className="flex-1"
          style={{ pointerEvents: 'none' }}
        />

        {/* ── Resize grip (bottom-right corner) ──────────────────────────── */}
        <div
          className="nodrag nopan absolute bottom-0 right-0 w-5 h-5
                     flex items-end justify-end pr-1 pb-1
                     cursor-se-resize select-none"
          style={{ pointerEvents: 'auto' }}
          onMouseDown={onResizeMouseDown}
          title="드래그하여 크기 조정"
        >
          {/* Small grip icon — three diagonal dots */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className="opacity-50 hover:opacity-80 transition-opacity"
            aria-hidden
          >
            <circle cx="9" cy="9" r="1.2" fill={borderColor} />
            <circle cx="5" cy="9" r="1.2" fill={borderColor} />
            <circle cx="9" cy="5" r="1.2" fill={borderColor} />
          </svg>
        </div>
      </div>
    </>
  );
}

export default memo(ContainerNode);
