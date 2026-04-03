import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NODE_TYPE_CONFIGS, SERVICE_TYPE_ICONS, type ServerData } from '../../types';
import { getNodeIcon } from '../../utils/getNodeIcon';
import { useStore } from '../../store/useStore';

// ─── Types ──────────────────────────────────────────────────────────────────
type ServerNodeType = Node<ServerData, 'serverNode'>;

// ─── Helper ─────────────────────────────────────────────────────────────────
function getConfig(variant: string) {
  return (
    NODE_TYPE_CONFIGS.find((c) => c.variant === variant) ?? NODE_TYPE_CONFIGS[9]
  );
}

const ENV_COLORS: Record<string, string> = {
  PRD: 'bg-red-100 text-red-700',
  DEV: 'bg-green-100 text-green-700',
  STG: 'bg-yellow-100 text-yellow-700',
};

// ─── Handle dot style ────────────────────────────────────────────────────────
const handleStyle =
  'w-2 h-2 bg-gray-400 border border-gray-500 rounded-full';

// ─── Sub-components ──────────────────────────────────────────────────────────
interface NodeHeaderProps {
  icon: React.ReactNode;
  label: string;
  hostname: string;
  showHostname: boolean;
}

function NodeHeader({ icon, label, hostname, showHostname }: NodeHeaderProps) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-base leading-none mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-bold text-gray-800 leading-tight truncate">
          {label || '(이름 없음)'}
        </div>
        {showHostname && hostname && (
          <div className="text-[10px] text-gray-500 truncate mt-0.5">
            {hostname}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toggle button ────────────────────────────────────────────────────────────
interface ToggleButtonProps {
  mode: 'summary' | 'detail';
  onToggle: (e: React.MouseEvent) => void;
}

function ToggleButton({ mode, onToggle }: ToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded
                 bg-white/60 hover:bg-white/90 text-gray-500 hover:text-gray-700
                 border border-gray-300 transition-colors leading-none"
      title={mode === 'summary' ? '전체 보기' : '요약 보기'}
    >
      {mode === 'summary' ? '▼' : '▲'}
    </button>
  );
}

// ─── Summary mode body ────────────────────────────────────────────────────────
interface SummaryBodyProps {
  data: ServerData;
  showIp: boolean;
  showOs: boolean;
  showEnv: boolean;
  showServices: boolean;
}

function SummaryBody({ data, showIp, showOs, showEnv, showServices }: SummaryBodyProps) {
  const firstIp = data.ip?.[0];
  const services = data.services ?? [];
  return (
    <div className="mt-1.5 space-y-1">
      {showEnv && data.env && (
        <span
          className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            ENV_COLORS[data.env] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {data.env}
        </span>
      )}
      {showIp && firstIp && (
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded
                         bg-blue-50 text-blue-700 border border-blue-200 font-mono">
          {firstIp}
        </span>
      )}
      {showOs && data.os && (
        <div className="text-[10px] text-gray-600 truncate">{data.os}</div>
      )}
      {showServices && services.length > 0 && (
        <div className="space-y-0.5">
          {services.slice(0, 2).map((svc) => (
            <div key={svc.id} className="text-[10px] text-gray-600 truncate">
              {SERVICE_TYPE_ICONS[svc.type]}{svc.name}{svc.port ? ` :${svc.port}` : ''}{svc.sid ? ` (${svc.sid})` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail mode body ─────────────────────────────────────────────────────────
interface DetailBodyProps {
  data: ServerData;
  showHostname: boolean;
  showIp: boolean;
  showOs: boolean;
  showServices: boolean;
  showCpuMemory: boolean;
  showRole: boolean;
  showEnv: boolean;
  showTags: boolean;
}

interface FieldRow {
  key: string;
  label: string;
  value: string;
}

function DetailBody({
  data,
  showHostname,
  showIp,
  showOs,
  showServices,
  showCpuMemory,
  showRole,
  showEnv,
  showTags,
}: DetailBodyProps) {
  const ipStr = data.ip?.filter(Boolean).join(', ');
  const services = data.services ?? [];

  const fields: FieldRow[] = [
    showHostname ? { key: 'hostname', label: '호스트명', value: data.hostname } : null,
    showIp       ? { key: 'ip',       label: 'IP',       value: ipStr ?? '' }    : null,
    showOs       ? { key: 'os',       label: 'OS',       value: data.os }        : null,
    showCpuMemory? { key: 'cpu',      label: 'CPU/MEM',  value: data.cpu_memory }: null,
    showRole     ? { key: 'role',     label: '역할',     value: data.role }      : null,
  ].filter((f): f is FieldRow => f !== null && Boolean(f.value));

  return (
    <div className="mt-2 space-y-1">
      {/* env badge */}
      {showEnv && data.env && (
        <span
          className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            ENV_COLORS[data.env] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {data.env}
        </span>
      )}

      {/* field rows */}
      {fields.map((f) => (
        <div key={f.key} className="flex gap-1 text-[10px] leading-snug">
          <span className="text-gray-400 shrink-0 w-12 text-right">{f.label}</span>
          <span className="text-gray-700 font-mono break-all">{f.value}</span>
        </div>
      ))}

      {/* services */}
      {showServices && services.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {services.map((svc) => (
            <div key={svc.id} className="flex items-center justify-between gap-1 text-[10px] leading-snug">
              <span className="text-gray-700 truncate">
                {SERVICE_TYPE_ICONS[svc.type]}{svc.name}{svc.sid ? ` (${svc.sid})` : ''}
              </span>
              {svc.port && (
                <span className="shrink-0 font-mono text-gray-500 bg-gray-100 px-1 rounded border border-gray-200">
                  :{svc.port}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* tags */}
      {showTags && data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {data.tags.filter(Boolean).map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function ServerNode({ data, selected, id }: NodeProps<ServerNodeType>) {
  const updateNode = useStore((s) => s.updateNode);
  const ds = useStore((s) => s.displaySettings);
  const config = getConfig(data.nodeVariant);

  const toggleMode = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateNode(id, {
        displayMode: data.displayMode === 'summary' ? 'detail' : 'summary',
      });
    },
    [id, data.displayMode, updateNode]
  );

  const isDetail = data.displayMode === 'detail';
  const maxWidth = isDetail ? 'max-w-[280px]' : 'max-w-[220px]';

  return (
    <>
      {/* Handles — top / bottom / left / right */}
      <Handle
        type="target"
        position={Position.Top}
        className={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        className={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={handleStyle}
      />

      {/* Card */}
      <div
        className={`
          rounded-lg px-3 py-2 min-w-[180px] ${maxWidth}
          transition-shadow duration-150
          ${selected ? 'shadow-[0_0_0_2px_#3B82F6,0_4px_12px_rgba(0,0,0,0.15)]' : 'shadow-md'}
        `}
        style={{
          background: data.color || '#F5F5F5',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: data.borderColor || '#9E9E9E',
        }}
      >
        {/* Header row: icon + label + toggle button */}
        <div className="flex items-start justify-between gap-1">
          <NodeHeader
            icon={getNodeIcon(data.nodeVariant, 'w-4 h-4 inline-block')}
            label={data.label}
            hostname={data.hostname}
            showHostname={ds.showHostname}
          />
          <ToggleButton mode={data.displayMode} onToggle={toggleMode} />
        </div>

        {/* Body */}
        {isDetail ? (
          <DetailBody
            data={data}
            showHostname={ds.showHostname}
            showIp={ds.showIp}
            showOs={ds.showOs}
            showServices={ds.showServices}
            showCpuMemory={ds.showCpuMemory}
            showRole={ds.showRole}
            showEnv={ds.showEnv}
            showTags={ds.showTags}
          />
        ) : (
          <SummaryBody
            data={data}
            showIp={ds.showIp}
            showOs={ds.showOs}
            showEnv={ds.showEnv}
            showServices={ds.showServices}
          />
        )}
      </div>
    </>
  );
}

export default memo(ServerNode);
