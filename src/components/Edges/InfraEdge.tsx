import { useMemo } from 'react';
import {
  type EdgeProps,
  type Edge,
  BaseEdge,
} from '@xyflow/react';
import { type EdgeData } from '../../types';
import { useStore } from '../../store/useStore';
import { computeAvoidingPath } from '../../utils/edgeRouting';

type InfraEdgeType = Edge<EdgeData, 'infraEdge'>;

function InfraEdge(props: EdgeProps<InfraEdgeType>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    selected,
    data,
  } = props;

  const nodes = useStore((s) => s.nodes);

  const color = data?.color ?? '#666666';
  const lineStyle = data?.lineStyle ?? 'solid';
  const direction = data?.direction ?? 'none';

  const baseWidth = data?.strokeWidth ?? 1;
  const strokeWidth = selected ? baseWidth + 1 : baseWidth;
  const strokeDasharray = lineStyle === 'dashed' ? '5,5' : undefined;

  // Obstacle-avoiding orthogonal path
  const edgePath = useMemo(
    () => computeAvoidingPath(
      sourceX, sourceY,
      targetX, targetY,
      props.source,
      props.target,
      nodes,
    ),
    [sourceX, sourceY, targetX, targetY, props.source, props.target, nodes],
  );

  const markerEndId = `arrow-end-${id}`;
  const markerStartId = `arrow-start-${id}`;

  const markerEnd =
    direction === 'unidirectional' || direction === 'bidirectional'
      ? `url(#${markerEndId})`
      : undefined;

  const markerStart =
    direction === 'bidirectional' ? `url(#${markerStartId})` : undefined;

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
    </>
  );
}

export default InfraEdge;
