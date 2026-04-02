// ============================================================
// 인프라 구조도 편집기 - 공유 타입 정의
// ============================================================

/** 서버 노드 유형 */
export type NodeVariant =
  | 'physical'    // 물리 서버
  | 'vm'          // 가상 머신
  | 'db'          // 데이터베이스 서버
  | 'was'         // 웹/애플리케이션 서버
  | 'web'         // 웹 서버
  | 'firewall'    // 방화벽
  | 'lb'          // 로드밸런서
  | 'client'      // 클라이언트
  | 'external'    // 외부 시스템
  | 'custom';     // 사용자 정의

/** 운영 환경 */
export type Environment = 'PRD' | 'DEV' | 'STG' | '';

/** 서버 노드 메타데이터 */
export interface ServerData {
  label: string;
  hostname: string;
  ip: string[];
  os: string;
  db: string;
  sw: string;
  cpu_memory: string;
  role: string;
  env: Environment;
  tags: string[];
  nodeVariant: NodeVariant;
  color: string;
  borderColor: string;
  /** 요약 표시 모드 vs 전체 표시 모드 */
  displayMode: 'summary' | 'detail';
}

/** React Flow 노드에 사용될 전체 노드 타입 */
export interface InfraNode {
  id: string;
  type: 'serverNode';
  position: { x: number; y: number };
  data: ServerData;
  parentId?: string; // zone 소속
}

/** 엣지 방향 */
export type EdgeDirection = 'unidirectional' | 'bidirectional' | 'none';

/** 엣지 스타일 */
export type EdgeLineStyle = 'solid' | 'dashed';

/** 통신 연결선 메타데이터 */
export interface EdgeData {
  label: string;
  protocol: string;
  ports: string[];
  description: string;
  direction: EdgeDirection;
  lineStyle: EdgeLineStyle;
  color: string;
}

/** React Flow 엣지에 사용될 전체 엣지 타입 */
export interface InfraEdge {
  id: string;
  source: string;
  target: string;
  type: 'infraEdge';
  data: EdgeData;
}

/** 네트워크 존 */
export interface Zone {
  id: string;
  label: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

/** 캔버스 상태 */
export interface CanvasState {
  zoom: number;
  position: { x: number; y: number };
}

/** 전체 다이어그램 데이터 (저장 형식) */
export interface DiagramData {
  version: string;
  canvas: CanvasState;
  nodes: InfraNode[];
  edges: InfraEdge[];
  zones: Zone[];
}

/** 노드 유형별 기본 설정 */
export interface NodeTypeConfig {
  variant: NodeVariant;
  label: string;
  icon: string;
  defaultColor: string;
  defaultBorderColor: string;
}

/** 노드 유형 설정 목록 */
export const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
  { variant: 'physical',  label: '물리 서버',     icon: '🖥️', defaultColor: '#E8EAF6', defaultBorderColor: '#3F51B5' },
  { variant: 'vm',        label: '가상 머신',     icon: '💻', defaultColor: '#E3F2FD', defaultBorderColor: '#2196F3' },
  { variant: 'db',        label: 'DB 서버',       icon: '🗄️', defaultColor: '#FFF3E0', defaultBorderColor: '#FF9800' },
  { variant: 'was',       label: 'WAS 서버',      icon: '⚙️', defaultColor: '#E8F5E9', defaultBorderColor: '#4CAF50' },
  { variant: 'web',       label: '웹 서버',       icon: '🌐', defaultColor: '#E0F7FA', defaultBorderColor: '#00BCD4' },
  { variant: 'firewall',  label: '방화벽',        icon: '🛡️', defaultColor: '#FCE4EC', defaultBorderColor: '#E91E63' },
  { variant: 'lb',        label: '로드밸런서',    icon: '⚖️', defaultColor: '#F3E5F5', defaultBorderColor: '#9C27B0' },
  { variant: 'client',    label: '클라이언트',    icon: '👤', defaultColor: '#ECEFF1', defaultBorderColor: '#607D8B' },
  { variant: 'external',  label: '외부 시스템',   icon: '☁️', defaultColor: '#FFF9C4', defaultBorderColor: '#FBC02D' },
  { variant: 'custom',    label: '사용자 정의',   icon: '📦', defaultColor: '#F5F5F5', defaultBorderColor: '#9E9E9E' },
];

/** 새 서버 노드의 기본 데이터 생성 */
export function createDefaultServerData(variant: NodeVariant): ServerData {
  const config = NODE_TYPE_CONFIGS.find(c => c.variant === variant)!;
  return {
    label: config.label,
    hostname: '',
    ip: [''],
    os: '',
    db: '',
    sw: '',
    cpu_memory: '',
    role: '',
    env: '',
    tags: [],
    nodeVariant: variant,
    color: config.defaultColor,
    borderColor: config.defaultBorderColor,
    displayMode: 'summary',
  };
}

/** 새 엣지의 기본 데이터 생성 */
export function createDefaultEdgeData(): EdgeData {
  return {
    label: '',
    protocol: '',
    ports: [],
    description: '',
    direction: 'unidirectional',
    lineStyle: 'solid',
    color: '#666666',
  };
}
