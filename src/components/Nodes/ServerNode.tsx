import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { type ServerData, type ServiceEntry } from '../../types';
import { useStore } from '../../store/useStore';

type ServerNodeType = Node<ServerData, 'serverNode'>;

// ─── Handle style ────────────────────────────────────────────────────────────
const handleStyle = 'w-2 h-2 bg-gray-400 border border-gray-500 rounded-full';
const svcHandleBase: React.CSSProperties = {
  width: 6,
  height: 6,
  background: '#9CA3AF',
  border: '1px solid #6B7280',
  borderRadius: '50%',
};

// ─── 행 색상 규칙 ────────────────────────────────────────────────────────────
function getServiceBg(svc: ServiceEntry): string {
  if (svc.type === 'db') return 'bg-yellow-100 text-gray-900';
  return 'bg-white text-gray-800';
}

const OS_CLASS = 'bg-yellow-300 text-gray-900';
const IP_ROW_CLASS = 'bg-gray-200 text-gray-700';

// ─── Main component ──────────────────────────────────────────────────────────
function ServerNode({ data, selected, id }: NodeProps<ServerNodeType>) {
  const ds = useStore((s) => s.displaySettings);
  const services = data.services ?? [];

  return (
    <>
      {/* Default node handles (top/bottom) for general connections */}
      <Handle type="target" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="target" position={Position.Left} id="left" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />

      <div
        className={`
          min-w-[150px] max-w-[240px] border text-[11px] leading-tight
          ${selected
            ? 'shadow-[0_0_0_2px_#3B82F6,0_2px_8px_rgba(0,0,0,0.2)]'
            : 'shadow-sm'
          }
        `}
        style={{ borderColor: data.borderColor || '#666' }}
      >
        {/* ── Title bar ─────────────────────────────────── */}
        <div
          className="px-2 py-1.5 font-bold text-center truncate"
          style={{
            backgroundColor: data.borderColor || '#1565C0',
            color: isLightColor(data.borderColor) ? '#1a1a1a' : '#ffffff',
          }}
        >
          {data.label || '(이름 없음)'}
        </div>

        {/* ── Body rows ─────────────────────────────────── */}
        <div className="bg-white divide-y divide-gray-200">
          {/* Hostname */}
          {ds.showHostname && data.hostname && (
            <div className="px-2 py-1 text-center font-mono text-gray-700">
              {data.hostname}
            </div>
          )}

          {/* IP addresses */}
          {ds.showIp && data.ip?.some(Boolean) && (
            data.ip.filter(Boolean).map((ip, i) => (
              <div key={i} className={`px-2 py-0.5 text-center font-mono text-[10px] ${IP_ROW_CLASS}`}>
                {ip}
              </div>
            ))
          )}

          {/* Services — each row has its own left/right handles */}
          {ds.showServices && services.length > 0 && (
            services.map((svc) => (
              <div
                key={svc.id}
                className={`relative px-2 py-1 text-center font-medium ${getServiceBg(svc)}`}
              >
                {/* Service-specific handles on left/right of this row */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`svc-${svc.id}-in`}
                  style={{ ...svcHandleBase, position: 'absolute', left: -3, top: '50%', transform: 'translateY(-50%)' }}
                />
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`svc-${svc.id}-out`}
                  style={{ ...svcHandleBase, position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)' }}
                />
                {svc.sid || svc.name}
                {svc.sid && svc.name ? ` (${svc.name})` : ''}
                {svc.port ? ` :${svc.port}` : ''}
              </div>
            ))
          )}

          {/* Env badge */}
          {ds.showEnv && data.env && (
            <div className="px-2 py-0.5 text-center text-[10px] font-semibold text-gray-500">
              {data.env}
            </div>
          )}

          {/* CPU/Memory */}
          {ds.showCpuMemory && data.cpu_memory && (
            <div className="px-2 py-0.5 text-center text-[10px] text-gray-500">
              {data.cpu_memory}
            </div>
          )}

          {/* Role */}
          {ds.showRole && data.role && (
            <div className="px-2 py-0.5 text-center text-[10px] text-gray-500">
              {data.role}
            </div>
          )}

          {/* Tags */}
          {ds.showTags && data.tags?.filter(Boolean).length > 0 && (
            <div className="px-2 py-0.5 flex flex-wrap gap-0.5 justify-center">
              {data.tags.filter(Boolean).map((tag) => (
                <span key={tag} className="text-[9px] px-1 bg-gray-100 text-gray-500 border border-gray-200">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* OS */}
          {ds.showOs && data.os && (
            <div className={`px-2 py-1 text-center font-medium ${OS_CLASS}`}>
              {data.os}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function isLightColor(hex?: string): boolean {
  if (!hex) return false;
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export default memo(ServerNode);
