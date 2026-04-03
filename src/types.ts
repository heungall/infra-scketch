// ============================================================
// 인프라 구조도 편집기 - 공유 타입 정의
// ============================================================

/** 서버 노드 유형 */
export type NodeVariant =
  | 'physical'    // 물리 서버
  | 'vm'          // 가상 머신 (컨테이너)
  | 'db'          // 데이터베이스 서버
  | 'was'         // 웹/애플리케이션 서버
  | 'web'         // 웹 서버
  | 'firewall'    // 방화벽 (컨테이너)
  | 'lb'          // 로드밸런서
  | 'client'      // 클라이언트
  | 'external'    // 외부 시스템
  | 'custom'      // 사용자 정의
  | 'zone';       // 네트워크 존 (컨테이너)

/** 컨테이너로 동작하는 variant 목록 */
export const CONTAINER_VARIANTS: NodeVariant[] = ['zone', 'firewall', 'vm'];

/** 해당 variant가 컨테이너인지 판별 */
export function isContainerVariant(variant: NodeVariant): boolean {
  return CONTAINER_VARIANTS.includes(variant);
}

/** 운영 환경 */
export type Environment = 'PRD' | 'DEV' | 'STG' | '';

// ============================================================
// 서비스 (DB/미들웨어/애플리케이션)
// ============================================================

export type ServiceType = 'db' | 'middleware' | 'application' | 'custom';

export interface ServiceEntry {
  id: string;
  type: ServiceType;
  name: string;
  port: string;
  sid: string;
  description: string;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  db: 'DB',
  middleware: '미들웨어',
  application: '애플리케이션',
  custom: '기타',
};

export const SERVICE_TYPE_ICONS: Record<ServiceType, string> = {
  db: '🗄️',
  middleware: '⚙️',
  application: '📱',
  custom: '🔧',
};

/** 서버 노드 메타데이터 (컨테이너 노드도 동일 구조 사용) */
export interface ServerData {
  label: string;
  hostname: string;
  ip: string[];
  os: string;
  services: ServiceEntry[];
  cpu_memory: string;
  role: string;
  env: Environment;
  tags: string[];
  nodeVariant: NodeVariant;
  color: string;
  borderColor: string;
  displayMode: 'summary' | 'detail';
}

/** React Flow 노드 타입 */
export type InfraNodeType = 'serverNode' | 'containerNode';

/** React Flow 노드에 사용될 전체 노드 타입 */
export interface InfraNode {
  id: string;
  type: InfraNodeType;
  position: { x: number; y: number };
  data: ServerData;
  parentId?: string;
  style?: { width?: number; height?: number };
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
  strokeWidth: number;
  /** 소스 노드의 연결 서비스 ID */
  sourceServiceId?: string;
  /** 타겟 노드의 연결 서비스 ID */
  targetServiceId?: string;
}

/** React Flow 엣지에 사용될 전체 엣지 타입 */
export interface InfraEdge {
  id: string;
  source: string;
  target: string;
  type: 'infraEdge';
  data: EdgeData;
}

/** 네트워크 존 (레거시 — 이제 컨테이너 노드로 대체, 하위 호환용) */
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
  displaySettings?: NodeDisplaySettings;
}

// ============================================================
// 노드 유형 설정
// ============================================================

export interface NodeTypeConfig {
  variant: NodeVariant;
  label: string;
  icon: string;
  defaultColor: string;
  defaultBorderColor: string;
  isContainer: boolean;
}

/** 서버 노드 유형 설정 — borderColor가 타이틀 바 색상으로 사용됨 */
export const SERVER_NODE_CONFIGS: NodeTypeConfig[] = [
  { variant: 'physical',  label: '물리 서버',     icon: '🖥️', defaultColor: '#FFFFFF', defaultBorderColor: '#1565C0', isContainer: false },
  { variant: 'db',        label: 'DB 서버',       icon: '🗄️', defaultColor: '#FFFFFF', defaultBorderColor: '#1565C0', isContainer: false },
  { variant: 'was',       label: 'WAS 서버',      icon: '⚙️', defaultColor: '#FFFFFF', defaultBorderColor: '#1565C0', isContainer: false },
  { variant: 'web',       label: '웹 서버',       icon: '🌐', defaultColor: '#FFFFFF', defaultBorderColor: '#0277BD', isContainer: false },
  { variant: 'lb',        label: '로드밸런서',    icon: '⚖️', defaultColor: '#FFFFFF', defaultBorderColor: '#6A1B9A', isContainer: false },
  { variant: 'client',    label: '클라이언트',    icon: '👤', defaultColor: '#FFFFFF', defaultBorderColor: '#455A64', isContainer: false },
  { variant: 'external',  label: '외부 시스템',   icon: '☁️', defaultColor: '#FFFFFF', defaultBorderColor: '#E65100', isContainer: false },
  { variant: 'custom',    label: '사용자 정의',   icon: '📦', defaultColor: '#FFFFFF', defaultBorderColor: '#616161', isContainer: false },
];

/** 컨테이너 노드 유형 설정 */
export const CONTAINER_NODE_CONFIGS: NodeTypeConfig[] = [
  { variant: 'zone',      label: '네트워크 존',   icon: '🔲', defaultColor: '#E3F2FD', defaultBorderColor: '#1976D2', isContainer: true },
  { variant: 'firewall',  label: '방화벽',        icon: '🛡️', defaultColor: '#FCE4EC', defaultBorderColor: '#E91E63', isContainer: true },
  { variant: 'vm',        label: '가상 머신',     icon: '💻', defaultColor: '#E8F5E9', defaultBorderColor: '#2E7D32', isContainer: true },
];

/** 전체 노드 유형 설정 (하위 호환) */
export const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
  ...CONTAINER_NODE_CONFIGS,
  ...SERVER_NODE_CONFIGS,
];

// ============================================================
// 프리셋 색상 팔레트
// ============================================================

export interface PresetColor {
  name: string;
  bg: string;
  border: string;
}

export const PREDEFINED_COLORS: PresetColor[] = [
  // 진한 색상 (타이틀 바용)
  { name: '진한 파랑', bg: '#FFFFFF', border: '#1565C0' },
  { name: '진한 남색', bg: '#FFFFFF', border: '#283593' },
  { name: '진한 초록', bg: '#FFFFFF', border: '#2E7D32' },
  { name: '진한 빨강', bg: '#FFFFFF', border: '#C62828' },
  { name: '진한 주황', bg: '#FFFFFF', border: '#E65100' },
  { name: '진한 보라', bg: '#FFFFFF', border: '#6A1B9A' },
  { name: '진한 청록', bg: '#FFFFFF', border: '#00695C' },
  { name: '진한 회색', bg: '#FFFFFF', border: '#455A64' },
  // 연한 색상 (컨테이너/배경용)
  { name: '연한 파랑', bg: '#E3F2FD', border: '#1976D2' },
  { name: '연한 초록', bg: '#E8F5E9', border: '#4CAF50' },
  { name: '연한 노랑', bg: '#FFFDE7', border: '#F9A825' },
  { name: '연한 빨강', bg: '#FFEBEE', border: '#E53935' },
  { name: '연한 보라', bg: '#F3E5F5', border: '#9C27B0' },
  { name: '연한 회색', bg: '#ECEFF1', border: '#607D8B' },
];

// ============================================================
// 노드 표시 필드 설정
// ============================================================

/** 노드 위에 어떤 정보를 표시할지 설정 */
export interface NodeDisplaySettings {
  showHostname: boolean;
  showIp: boolean;
  showOs: boolean;
  showServices: boolean;
  showCpuMemory: boolean;
  showRole: boolean;
  showEnv: boolean;
  showTags: boolean;
}

/** 표시 설정 필드 메타 (UI 렌더링용) */
export interface DisplayFieldMeta {
  key: keyof NodeDisplaySettings;
  label: string;
}

export const DISPLAY_FIELD_OPTIONS: DisplayFieldMeta[] = [
  { key: 'showHostname',  label: '호스트명' },
  { key: 'showIp',        label: 'IP 주소' },
  { key: 'showOs',        label: 'OS 정보' },
  { key: 'showServices',  label: '서비스 (DB/MW)' },
  { key: 'showCpuMemory', label: 'CPU/Memory' },
  { key: 'showRole',      label: '역할' },
  { key: 'showEnv',       label: '운영 환경' },
  { key: 'showTags',      label: '태그' },
];

export const DEFAULT_DISPLAY_SETTINGS: NodeDisplaySettings = {
  showHostname: true,
  showIp: true,
  showOs: true,
  showServices: true,
  showCpuMemory: false,
  showRole: false,
  showEnv: true,
  showTags: false,
};

// ============================================================
// 아이콘 시스템
// ============================================================
// 아이콘 출처: Flaticon - zero_wing
// https://www.flaticon.com/kr/free-icons/
// "방법 아이콘 제작자: zero_wing - Flaticon"
// ============================================================

import physicalIcon from './assets/icons/physical.png';
import dbIcon from './assets/icons/db.png';
import firewallIcon from './assets/icons/firewall.png';
import vmIcon from './assets/icons/vm.png';
import wasIcon from './assets/icons/was.png';
import lbIcon from './assets/icons/lb.png';

/** variant별 커스텀 아이콘 URL 맵 */
export const CUSTOM_ICONS: Partial<Record<NodeVariant, string>> = {
  physical: physicalIcon,
  db: dbIcon,
  firewall: firewallIcon,
  vm: vmIcon,
  was: wasIcon,
  lb: lbIcon,
};

// ============================================================
// 기본 데이터 생성 헬퍼
// ============================================================

/** 컨테이너 기본 크기 */
export const CONTAINER_DEFAULT_SIZE: Record<string, { width: number; height: number }> = {
  zone:     { width: 700, height: 500 },
  firewall: { width: 500, height: 400 },
  vm:       { width: 400, height: 300 },
};

export function createDefaultServerData(variant: NodeVariant): ServerData {
  const config = NODE_TYPE_CONFIGS.find(c => c.variant === variant)!;
  return {
    label: config.label,
    hostname: '',
    ip: [''],
    os: '',
    services: [],
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

export function createDefaultEdgeData(): EdgeData {
  return {
    label: '',
    protocol: '',
    ports: [],
    description: '',
    direction: 'none',
    lineStyle: 'solid',
    color: '#666666',
    strokeWidth: 1,
  };
}
