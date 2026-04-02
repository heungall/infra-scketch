// TODO: Agent 3 (Sonnet) 구현
import { BaseEdge, getStraightPath } from '@xyflow/react';

export default function InfraEdge(props: any) {
  const { sourceX, sourceY, targetX, targetY } = props;
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return <BaseEdge path={edgePath} />;
}
