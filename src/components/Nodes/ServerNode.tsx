// TODO: Agent 2 (Sonnet) 구현
import { Handle, Position } from '@xyflow/react';

export default function ServerNode({ data }: { data: any }) {
  return (
    <div className="bg-white border rounded p-2 min-w-[140px]">
      <Handle type="target" position={Position.Left} />
      <div className="text-sm font-bold">{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
