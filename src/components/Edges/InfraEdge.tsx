import {
  type EdgeProps,
  type Edge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { type EdgeData } from '../../types';
import { useStore } from '../../store/useStore';

type InfraEdgeType = Edge<EdgeData, 'infraEdge'>;

function InfraEdge(props: EdgeProps<InfraEdgeType>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
  } = props;

  const nodes = useStore((s) => s.nodes);
  const sourceNode = nodes.find(n => n.id === props.source);
  const targetNode = nodes.find(n => n.id === props.target);
  const sourceSvc = sourceNode?.data.services?.find(s => s.id === data?.sourceServiceId);
  const targetSvc = targetNode?.data.services?.find(s => s.id === data?.targetServiceId);

  const color = data?.color ?? '#666666';
  const lineStyle = data?.lineStyle ?? 'solid';
  const direction = data?.direction ?? 'unidirectional';
  const label = data?.label ?? '';
  const protocol = data?.protocol ?? '';
  const ports = data?.ports ?? [];

  const strokeWidth = selected ? 3 : 2;
  const strokeDasharray = lineStyle === 'dashed' ? '5,5' : undefined;

  // Orthogonal (right-angle) path
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  const markerEndId = `arrow-end-${id}`;
  const markerStartId = `arrow-start-${id}`;

  const markerEnd =
    direction === 'unidirectional' || direction === 'bidirectional'
      ? `url(#${markerEndId})`
      : undefined;

  const markerStart =
    direction === 'bidirectional' ? `url(#${markerStartId})` : undefined;

  // Build label
  const portString = ports.length > 0 ? ports.join(', ') : '';
  const protocolPortLine =
    protocol && portString
      ? `${protocol}:${portString}`
      : protocol || (portString ? `포트: ${portString}` : '');

  const serviceLine = sourceSvc || targetSvc
    ? `${sourceSvc?.name ?? '?'} → ${targetSvc?.name ?? '?'}`
    : '';

  const hasLabel = label.trim() !== '' || protocolPortLine.trim() !== '' || serviceLine !== '';

  return (
    <>
      <defs>
        {(direction === 'unidirectional' || direction === 'bidirectional') && (
          <marker
            id={markerEndId}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={color} />
          </marker>
        )}
        {direction === 'bidirectional' && (
          <marker
            id={markerStartId}
            markerWidth="10"
            markerHeight="7"
            refX="1"
            refY="3.5"
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={color} />
          </marker>
        )}
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray,
        }}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />

      {/* 엣지 레이블 제거 — 연결 정보는 노드 서비스 행에서 확인 */}
    </>
  );
}

export default InfraEdge;
