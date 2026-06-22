import { useStore } from '../../store/useStore';
import {
  type ServerData,
  type EdgeData,
  type Environment,
  type HaRole,
  type NodeVariant,
  type EdgeDirection,
  type EdgeLineStyle,
  type PresetColor,
  type ServiceEntry,
  type ServiceType,
  PREDEFINED_COLORS,
  SERVER_NODE_CONFIGS,
  CONTAINER_NODE_CONFIGS,
  SERVICE_TYPE_LABELS,
  isContainerVariant,
} from '../../types';

// ---------------------------------------------------------------------------
// Shared field components
// ---------------------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-gray-500 mb-1">{children}</label>;
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm border border-gray-300 rounded px-2 py-1"
    />
  );
}

function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full text-sm border border-gray-300 rounded px-2 py-1"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 font-mono"
        placeholder="#000000"
      />
    </div>
  );
}

function StringListInput({
  values,
  onChange,
  placeholder,
  addLabel,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const list = values.length > 0 ? values : [''];

  const updateExact = (idx: number, val: string) => {
    const next = [...list];
    next[idx] = val;
    onChange(next);
  };

  const remove = (idx: number) => {
    const next = list.filter((_, i) => i !== idx);
    onChange(next.length === 0 ? [''] : next);
  };

  const add = () => onChange([...list, '']);

  return (
    <div className="space-y-1">
      {list.map((v, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <input
            type="text"
            value={v}
            onChange={(e) => updateExact(idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
          />
          {list.length > 1 && (
            <button
              onClick={() => remove(idx)}
              className="text-red-400 hover:text-red-600 text-sm px-1"
              title="삭제"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="text-xs text-blue-500 hover:text-blue-700 mt-0.5"
      >
        + {addLabel ?? '추가'}
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-200">
      {children}
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="mb-3">{children}</div>;
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full mt-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 rounded px-3 py-1.5 text-sm font-medium"
    >
      삭제
    </button>
  );
}

// ---------------------------------------------------------------------------
// Color preset picker component
// ---------------------------------------------------------------------------

function ColorPresetPicker({
  color,
  borderColor,
  onColorChange,
  onBorderChange,
  onPresetSelect,
}: {
  color: string;
  borderColor: string;
  onColorChange: (v: string) => void;
  onBorderChange: (v: string) => void;
  onPresetSelect: (preset: PresetColor) => void;
}) {
  return (
    <div>
      <FieldGroup>
        <FieldLabel>배경색</FieldLabel>
        <ColorInput value={color} onChange={onColorChange} />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>테두리색</FieldLabel>
        <ColorInput value={borderColor} onChange={onBorderChange} />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>프리셋 색상</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {PREDEFINED_COLORS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onPresetSelect(preset)}
              title={preset.name}
              className="w-6 h-6 rounded-md border-2 hover:scale-110 transition-transform cursor-pointer"
              style={{ backgroundColor: preset.bg, borderColor: preset.border }}
            />
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service list editor component
// ---------------------------------------------------------------------------

function ServiceListEditor({
  services,
  onChange,
}: {
  services: ServiceEntry[];
  onChange: (services: ServiceEntry[]) => void;
}) {
  const addService = () => {
    const newSvc: ServiceEntry = {
      id: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'db',
      name: '',
      port: '',
      sid: '',
      description: '',
    };
    onChange([...services, newSvc]);
  };

  const updateService = (idx: number, updates: Partial<ServiceEntry>) => {
    const next = [...services];
    next[idx] = { ...next[idx], ...updates };
    onChange(next);
  };

  const removeService = (idx: number) => {
    onChange(services.filter((_, i) => i !== idx));
  };

  const typeOptions: { value: ServiceType; label: string }[] = (
    Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]
  ).map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-1.5">
      {services.map((svc, idx) => (
        <div key={svc.id} className="bg-gray-50 border border-gray-200 rounded px-1.5 py-1.5 space-y-1">
          {/* 1행: 타입 + 이름 + 삭제 */}
          <div className="flex items-center gap-1">
            <select
              value={svc.type}
              onChange={(e) => updateService(idx, { type: e.target.value as ServiceType })}
              className="w-16 text-xs border border-gray-300 rounded px-1 py-0.5 shrink-0"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={svc.name}
              onChange={(e) => updateService(idx, { name: e.target.value })}
              placeholder="Oracle 19c"
              className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-1.5 py-0.5"
            />
            <button
              onClick={() => removeService(idx)}
              className="text-red-400 hover:text-red-600 text-sm px-0.5 shrink-0"
              title="삭제"
            >
              ×
            </button>
          </div>
          {/* 2행: 포트 + SID */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={svc.port}
              onChange={(e) => updateService(idx, { port: e.target.value })}
              placeholder="포트 (1521)"
              className="w-20 text-xs border border-gray-300 rounded px-1.5 py-0.5 font-mono shrink-0"
            />
            <input
              type="text"
              value={svc.sid ?? ''}
              onChange={(e) => updateService(idx, { sid: e.target.value })}
              placeholder="SID (ORCL)"
              className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-1.5 py-0.5 font-mono"
            />
          </div>
        </div>
      ))}
      <button
        onClick={addService}
        className="text-xs text-blue-500 hover:text-blue-700 mt-0.5"
      >
        + 서비스 추가
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node editor panel
// ---------------------------------------------------------------------------

function NodeEditor({ nodeId }: { nodeId: string }) {
  const node = useStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNode = useStore((s) => s.updateNode);
  const deleteNode = useStore((s) => s.deleteNode);
  const selectNode = useStore((s) => s.selectNode);
  const getChildNodes = useStore((s) => s.getChildNodes);

  if (!node) return null;

  const d = node.data;
  const isContainer = isContainerVariant(d.nodeVariant);
  const isZoneContainer = d.nodeVariant === 'zone';
  const childCount = isContainer ? getChildNodes(nodeId).length : 0;

  const upd = (partial: Partial<ServerData>) => updateNode(nodeId, partial);

  const envOptions: { value: Environment; label: string }[] = [
    { value: '', label: '(없음)' },
    { value: 'PRD', label: 'PRD (운영)' },
    { value: 'DEV', label: 'DEV (개발)' },
    { value: 'STG', label: 'STG (스테이징)' },
  ];

  const haRoleOptions: { value: HaRole; label: string }[] = [
    { value: '', label: '(없음)' },
    { value: 'active', label: 'Active' },
    { value: 'standby', label: 'Standby' },
  ];

  const serverVariantOptions: { value: NodeVariant; label: string }[] = SERVER_NODE_CONFIGS.map(
    (c) => ({ value: c.variant, label: c.label })
  );

  const containerVariantOptions: { value: NodeVariant; label: string }[] = CONTAINER_NODE_CONFIGS.map(
    (c) => ({ value: c.variant, label: c.label })
  );

  const variantOptions = isContainer ? containerVariantOptions : serverVariantOptions;

  const titleIcon = isContainer
    ? (d.nodeVariant === 'zone' ? '🔲' : d.nodeVariant === 'firewall' ? '🛡️' : '💻')
    : '🖥️';

  const titleText = isContainer ? '컨테이너 편집' : '서버 노드 편집';

  return (
    <div>
      <SectionTitle>{titleIcon} {titleText}</SectionTitle>

      {/* Label — shown for all node types */}
      <FieldGroup>
        <FieldLabel>서버명 (노드 타이틀) *</FieldLabel>
        <TextInput value={d.label} onChange={(v) => upd({ label: v })} placeholder="서버명" />
      </FieldGroup>

      {/* Fields shown only for non-zone containers and all server nodes */}
      {!isZoneContainer && (
        <>
          <FieldGroup>
            <FieldLabel>호스트명 (Hostname) *</FieldLabel>
            <TextInput value={d.hostname} onChange={(v) => upd({ hostname: v })} placeholder="was01.internal.com" />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>IP 주소 *</FieldLabel>
            <StringListInput
              values={d.ip}
              onChange={(v) => upd({ ip: v })}
              placeholder="10.0.1.20"
              addLabel="IP 추가"
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>OS 종류 및 버전 *</FieldLabel>
            <TextInput value={d.os} onChange={(v) => upd({ os: v })} placeholder="RHEL 8.6" />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>설치된 서비스 (DB / 미들웨어 등)</FieldLabel>
            <ServiceListEditor
              services={d.services ?? []}
              onChange={(services) => upd({ services })}
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>CPU / Memory 사양</FieldLabel>
            <TextInput value={d.cpu_memory} onChange={(v) => upd({ cpu_memory: v })} placeholder="16 Core / 64 GB" />
          </FieldGroup>
        </>
      )}

      {/* Role field — labelled differently for zone containers */}
      <FieldGroup>
        <FieldLabel>{isZoneContainer ? '존 설명' : '역할 / 설명'}</FieldLabel>
        <TextInput value={d.role} onChange={(v) => upd({ role: v })} placeholder={isZoneContainer ? '네트워크 존 설명' : '주문 처리 WAS'} />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>운영 환경</FieldLabel>
        <SelectInput<Environment>
          value={d.env}
          onChange={(v) => upd({ env: v })}
          options={envOptions}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>태그</FieldLabel>
        <StringListInput
          values={d.tags.length > 0 ? d.tags : ['']}
          onChange={(v) => upd({ tags: v.filter((t) => t.trim() !== '') })}
          placeholder="태그 입력"
          addLabel="태그 추가"
        />
      </FieldGroup>

      {/* ── 이중화 (HA) ──────────────────────────────── */}
      <FieldGroup>
        <FieldLabel>이중화 그룹</FieldLabel>
        <TextInput value={d.haGroup ?? ''} onChange={(v) => upd({ haGroup: v })} placeholder="예: DB-HA-1" />
      </FieldGroup>
      {d.haGroup && (
        <>
          <FieldGroup>
            <FieldLabel>이중화 역할</FieldLabel>
            <SelectInput<HaRole>
              value={d.haRole ?? ''}
              onChange={(v) => upd({ haRole: v })}
              options={haRoleOptions}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>VIP (가상 IP)</FieldLabel>
            <TextInput value={d.haVip ?? ''} onChange={(v) => upd({ haVip: v })} placeholder="예: 10.0.1.100" />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>가상 호스트명</FieldLabel>
            <TextInput value={d.haVhostname ?? ''} onChange={(v) => upd({ haVhostname: v })} placeholder="예: db-vip.internal.com" />
          </FieldGroup>
        </>
      )}

      <FieldGroup>
        <FieldLabel>노드 유형</FieldLabel>
        <SelectInput<NodeVariant>
          value={d.nodeVariant}
          onChange={(v) => upd({ nodeVariant: v })}
          options={variantOptions}
        />
      </FieldGroup>

      {/* Color preset picker */}
      <ColorPresetPicker
        color={d.color}
        borderColor={d.borderColor}
        onColorChange={(v) => upd({ color: v })}
        onBorderChange={(v) => upd({ borderColor: v })}
        onPresetSelect={(preset) => upd({ color: preset.bg, borderColor: preset.border })}
      />

      {/* Container-specific info section */}
      {isContainer && (
        <FieldGroup>
          <FieldLabel>컨테이너 크기</FieldLabel>
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
            {node.style?.width ?? '-'} × {node.style?.height ?? '-'} px
          </div>
          <FieldLabel>포함된 노드</FieldLabel>
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
            {childCount}개
          </div>
        </FieldGroup>
      )}

      <DeleteButton
        onClick={() => {
          deleteNode(nodeId);
          selectNode(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edge editor panel
// ---------------------------------------------------------------------------

function EdgeEditor({ edgeId }: { edgeId: string }) {
  const edge = useStore((s) => s.edges.find((e) => e.id === edgeId));
  const nodes = useStore((s) => s.nodes);
  const updateEdge = useStore((s) => s.updateEdge);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const selectEdge = useStore((s) => s.selectEdge);

  if (!edge) return null;

  const d = edge.data;

  const upd = (partial: Partial<EdgeData>) => updateEdge(edgeId, partial);

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const sourceServices = sourceNode?.data.services ?? [];
  const targetServices = targetNode?.data.services ?? [];

  const directionOptions: { value: EdgeDirection; label: string }[] = [
    { value: 'unidirectional', label: '단방향 →' },
    { value: 'bidirectional', label: '양방향 ↔' },
    { value: 'none', label: '무방향' },
  ];

  const lineStyleOptions: { value: EdgeLineStyle; label: string }[] = [
    { value: 'solid', label: '실선' },
    { value: 'dashed', label: '점선' },
  ];

  return (
    <div>
      <SectionTitle>연결선 편집</SectionTitle>

      <FieldGroup>
        <FieldLabel>레이블 (통신 유형)</FieldLabel>
        <TextInput value={d.label} onChange={(v) => upd({ label: v })} placeholder="DB통신, API통신 등" />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>프로토콜</FieldLabel>
        <TextInput value={d.protocol} onChange={(v) => upd({ protocol: v })} placeholder="TCP, UDP, JDBC, RFC 등" />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>포트 번호</FieldLabel>
        <StringListInput
          values={d.ports.length > 0 ? d.ports : ['']}
          onChange={(v) => upd({ ports: v.filter((p) => p.trim() !== '') })}
          placeholder="1521"
          addLabel="포트 추가"
        />
      </FieldGroup>

      {sourceServices.length > 0 && (
        <FieldGroup>
          <FieldLabel>소스 서비스 (출발 노드)</FieldLabel>
          <select
            value={d.sourceServiceId ?? ''}
            onChange={(e) => {
              const val = e.target.value || undefined;
              const svc = sourceServices.find((s) => s.id === val);
              upd({
                sourceServiceId: val,
                ...(svc && d.ports.length === 0 && svc.port
                  ? { ports: [svc.port] }
                  : {}),
              });
            }}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="">(없음)</option>
            {sourceServices.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.name}{svc.port ? ` :${svc.port}` : ''}
              </option>
            ))}
          </select>
        </FieldGroup>
      )}

      {targetServices.length > 0 && (
        <FieldGroup>
          <FieldLabel>타겟 서비스 (도착 노드)</FieldLabel>
          <select
            value={d.targetServiceId ?? ''}
            onChange={(e) => {
              const val = e.target.value || undefined;
              const svc = targetServices.find((s) => s.id === val);
              upd({
                targetServiceId: val,
                ...(svc && d.ports.length === 0 && svc.port
                  ? { ports: [svc.port] }
                  : {}),
              });
            }}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="">(없음)</option>
            {targetServices.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.name}{svc.port ? ` :${svc.port}` : ''}
              </option>
            ))}
          </select>
        </FieldGroup>
      )}

      <FieldGroup>
        <FieldLabel>설명 메모</FieldLabel>
        <textarea
          value={d.description}
          onChange={(e) => upd({ description: e.target.value })}
          placeholder="연결선에 대한 설명"
          rows={3}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>방향성</FieldLabel>
        <SelectInput<EdgeDirection>
          value={d.direction}
          onChange={(v) => upd({ direction: v })}
          options={directionOptions}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>선 스타일</FieldLabel>
        <SelectInput<EdgeLineStyle>
          value={d.lineStyle}
          onChange={(v) => upd({ lineStyle: v })}
          options={lineStyleOptions}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>선 굵기 ({d.strokeWidth ?? 1}px)</FieldLabel>
        <input
          type="range"
          min={1}
          max={6}
          value={d.strokeWidth ?? 1}
          onChange={(e) => upd({ strokeWidth: Number(e.target.value) })}
          className="w-full"
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>선 색상</FieldLabel>
        <ColorInput value={d.color} onChange={(v) => upd({ color: v })} />
      </FieldGroup>

      <DeleteButton
        onClick={() => {
          deleteEdge(edgeId);
          selectEdge(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Multi-select summary panel
// ---------------------------------------------------------------------------

function MultiSelectSummary({ nodeIds }: { nodeIds: string[] }) {
  const deleteSelectedNodes = useStore((s) => s.deleteSelectedNodes);
  const alignSelectedNodes = useStore((s) => s.alignSelectedNodes);

  return (
    <div>
      <SectionTitle>{nodeIds.length}개 노드 선택됨</SectionTitle>

      {/* Alignment buttons */}
      <FieldGroup>
        <FieldLabel>수평 정렬</FieldLabel>
        <div className="flex gap-1">
          <button onClick={() => alignSelectedNodes('left')} title="왼쪽 정렬" className="flex-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300">⫷ 왼쪽</button>
          <button onClick={() => alignSelectedNodes('center')} title="가운데 정렬" className="flex-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300">⫿ 가운데</button>
          <button onClick={() => alignSelectedNodes('right')} title="오른쪽 정렬" className="flex-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300">⫸ 오른쪽</button>
        </div>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>수직 정렬</FieldLabel>
        <div className="flex gap-1">
          <button onClick={() => alignSelectedNodes('top')} title="상단 정렬" className="flex-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300">▔ 상단</button>
          <button onClick={() => alignSelectedNodes('middle')} title="중앙 정렬" className="flex-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300">⊡ 중앙</button>
          <button onClick={() => alignSelectedNodes('bottom')} title="하단 정렬" className="flex-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300">▁ 하단</button>
        </div>
      </FieldGroup>

      <button
        onClick={deleteSelectedNodes}
        className="w-full mt-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 rounded px-3 py-1.5 text-sm font-medium"
      >
        선택 노드 모두 삭제 ({nodeIds.length}개)
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function PropertyPanel() {
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);

  const selectedNodeId = selectedNodeIds[0] ?? null;
  const multiSelected = selectedNodeIds.length >= 2;

  return (
    <div>
      {!selectedNodeId && !selectedEdgeId && (
        <div className="text-xs text-gray-400 mt-4 text-center">
          노드 또는 연결선을 선택하세요
        </div>
      )}

      {multiSelected && <MultiSelectSummary nodeIds={selectedNodeIds} />}
      {selectedNodeId && !multiSelected && <NodeEditor nodeId={selectedNodeId} />}
      {selectedEdgeId && <EdgeEditor edgeId={selectedEdgeId} />}
    </div>
  );
}
