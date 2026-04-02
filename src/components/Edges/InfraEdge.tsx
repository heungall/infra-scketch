import {
  type EdgeProps,
  type Edge,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { type EdgeData } from '../../types';

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

  const color = data?.color ?? '#666666';
  const lineStyle = data?.lineStyle ?? 'solid';
  const direction = data?.direction ?? 'unidirectional';
  const label = data?.label ?? '';
  const protocol = data?.protocol ?? '';
  const ports = data?.ports ?? [];

  const strokeWidth = selected ? 3 : 2;
  const strokeDasharray = lineStyle === 'dashed' ? '5,5' : undefined;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Build unique marker IDs per edge so colors don't bleed across edges
  const markerEndId = `arrow-end-${id}`;
  const markerStartId = `arrow-start-${id}`;

  const markerEnd =
    direction === 'unidirectional' || direction === 'bidirectional'
      ? `url(#${markerEndId})`
      : undefined;

  const markerStart =
    direction === 'bidirectional' ? `url(#${markerStartId})` : undefined;

  // Build label lines
  const portString = ports.length > 0 ? ports.join(', ') : '';
  const protocolPortLine =
    protocol && portString
      ? `${protocol}:${portString}`
      : protocol
      ? protocol
      : portString
      ? `포트: ${portString}`
      : '';

  const hasLabel = label.trim() !== '' || protocolPortLine.trim() !== '';

  return (
    <>
      {/* Per-edge SVG marker defs for correct arrowhead colors */}
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

      {hasLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="bg-white border border-gray-200 rounded px-2 py-1 shadow text-xs text-center whitespace-nowrap">
              {label.trim() !== '' && (
                <div className="font-semibold text-gray-700 leading-tight">
                  {label}
                </div>
              )}
              {protocolPortLine.trim() !== '' && (
                <div className="text-gray-500 leading-tight">
                  {protocolPortLine}
                </div>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default InfraEdge;
