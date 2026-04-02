import { useStore } from '../../store/useStore';
import {
  type ServerData,
  type EdgeData,
  type Environment,
  type NodeVariant,
  type EdgeDirection,
  type EdgeLineStyle,
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

  const update = (idx: number, val: string) => {
    const next = [...list];
    next[idx] = val;
    onChange(next.filter((_, i) => i !== idx || val !== '').length === 0 ? [''] : next);
  };

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
// Node editor panel
// ---------------------------------------------------------------------------

function NodeEditor({ nodeId }: { nodeId: string }) {
  const node = useStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNode = useStore((s) => s.updateNode);
  const deleteNode = useStore((s) => s.deleteNode);
  const selectNode = useStore((s) => s.selectNode);

  if (!node) return null;

  const d = node.data;

  const upd = (partial: Partial<ServerData>) => updateNode(nodeId, partial);

  const envOptions: { value: Environment; label: string }[] = [
    { value: '', label: '(없음)' },
    { value: 'PRD', label: 'PRD (운영)' },
    { value: 'DEV', label: 'DEV (개발)' },
    { value: 'STG', label: 'STG (스테이징)' },
  ];

  const variantOptions: { value: NodeVariant; label: string }[] = [
    { value: 'physical', label: '물리 서버' },
    { value: 'vm', label: '가상 머신' },
    { value: 'db', label: 'DB 서버' },
    { value: 'was', label: 'WAS 서버' },
    { value: 'web', label: '웹 서버' },
    { value: 'firewall', label: '방화벽' },
    { value: 'lb', label: '로드밸런서' },
    { value: 'client', label: '클라이언트' },
    { value: 'external', label: '외부 시스템' },
    { value: 'custom', label: '사용자 정의' },
  ];

  return (
    <div>
      <SectionTitle>서버 노드 편집</SectionTitle>

      <FieldGroup>
        <FieldLabel>서버명 (노드 타이틀) *</FieldLabel>
        <TextInput value={d.label} onChange={(v) => upd({ label: v })} placeholder="서버명" />
      </FieldGroup>

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
        <FieldLabel>DB 종류 및 버전</FieldLabel>
        <TextInput value={d.db} onChange={(v) => upd({ db: v })} placeholder="Oracle 19c" />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>SW / 미들웨어 버전</FieldLabel>
        <TextInput value={d.sw} onChange={(v) => upd({ sw: v })} placeholder="Tomcat 9.0" />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>CPU / Memory 사양</FieldLabel>
        <TextInput value={d.cpu_memory} onChange={(v) => upd({ cpu_memory: v })} placeholder="16 Core / 64 GB" />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>역할 / 설명</FieldLabel>
        <TextInput value={d.role} onChange={(v) => upd({ role: v })} placeholder="주문 처리 WAS" />
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
        <FieldLabel>노드 유형</FieldLabel>
        <SelectInput<NodeVariant>
          value={d.nodeVariant}
          onChange={(v) => upd({ nodeVariant: v })}
          options={variantOptions}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>노드 배경색</FieldLabel>
        <ColorInput value={d.color} onChange={(v) => upd({ color: v })} />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>테두리 색상</FieldLabel>
        <ColorInput value={d.borderColor} onChange={(v) => upd({ borderColor: v })} />
      </FieldGroup>

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
  const updateEdge = useStore((s) => s.updateEdge);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const selectEdge = useStore((s) => s.selectEdge);

  if (!edge) return null;

  const d = edge.data;

  const upd = (partial: Partial<EdgeData>) => updateEdge(edgeId, partial);

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

export default function PropertyPanel() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);

  return (
    <div className="w-72 bg-white border-l border-gray-200 p-3 shrink-0 overflow-y-auto">
      {!selectedNodeId && !selectedEdgeId && (
        <div className="text-xs text-gray-400 mt-4 text-center">
          노드 또는 연결선을 선택하세요
        </div>
      )}

      {selectedNodeId && <NodeEditor nodeId={selectedNodeId} />}
      {selectedEdgeId && <EdgeEditor edgeId={selectedEdgeId} />}
    </div>
  );
}
