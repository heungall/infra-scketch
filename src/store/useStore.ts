import { create } from 'zustand';
import {
  type InfraNode,
  type InfraEdge,
  type Zone,
  type ServerData,
  type EdgeData,
  type CanvasState,
  type DiagramData,
  type NodeVariant,
  type NodeDisplaySettings,
  type Environment,
  createDefaultServerData,
  createDefaultEdgeData,
  isContainerVariant,
  CONTAINER_DEFAULT_SIZE,
  DEFAULT_DISPLAY_SETTINGS,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Undo/Redo 히스토리
// ============================================================
interface Snapshot {
  nodes: InfraNode[];
  edges: InfraEdge[];
  zones: Zone[];
}

const MAX_HISTORY = 50;

// ============================================================
// Store 인터페이스
// ============================================================
export interface InfraStore {
  // --- 데이터 ---
  nodes: InfraNode[];
  edges: InfraEdge[];
  zones: Zone[];
  canvas: CanvasState;

  // --- 선택 상태 ---
  selectedNodeIds: string[];
  /** Convenience alias — first element of selectedNodeIds (or null) */
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // --- 히스토리 (Undo/Redo) ---
  history: Snapshot[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // --- 노드 CRUD ---
  addNode: (variant: NodeVariant, position: { x: number; y: number }, parentId?: string) => string;
  updateNode: (id: string, data: Partial<ServerData>) => void;
  deleteNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;

  // --- 컨테이너/부모-자식 ---
  setNodeParent: (nodeId: string, parentId: string | null) => void;
  resizeContainer: (id: string, width: number, height: number) => void;
  getChildNodes: (parentId: string) => InfraNode[];

  // --- 엣지 CRUD ---
  addEdge: (source: string, target: string, sourceServiceId?: string, targetServiceId?: string) => string;
  updateEdge: (id: string, data: Partial<EdgeData>) => void;
  deleteEdge: (id: string) => void;

  // --- 존 CRUD (레거시 호환) ---
  addZone: (label: string, position: { x: number; y: number }) => string;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  deleteZone: (id: string) => void;

  // --- 선택 ---
  selectNode: (id: string | null) => void;
  toggleNodeSelection: (id: string) => void;
  selectMultipleNodes: (ids: string[]) => void;
  deleteSelectedNodes: () => void;
  alignSelectedNodes: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  selectEdge: (id: string | null) => void;

  // --- 그리드 ---
  gridEnabled: boolean;
  gridSize: number;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;

  // --- 캔버스 ---
  setCanvas: (canvas: Partial<CanvasState>) => void;

  // --- 표시 설정 ---
  displaySettings: NodeDisplaySettings;
  updateDisplaySettings: (settings: Partial<NodeDisplaySettings>) => void;

  // --- 검색 / 필터 ---
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  envFilter: Environment | 'all';
  setEnvFilter: (env: Environment | 'all') => void;

  // --- 저장/불러오기 ---
  exportDiagram: () => DiagramData;
  importDiagram: (data: DiagramData) => void;
  clearDiagram: () => void;
}

function takeSnapshot(state: Pick<InfraStore, 'nodes' | 'edges' | 'zones'>): Snapshot {
  return {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
    zones: JSON.parse(JSON.stringify(state.zones)),
  };
}

export const useStore = create<InfraStore>((set, get) => ({
  // --- 초기 데이터 ---
  nodes: [],
  edges: [],
  zones: [],
  canvas: { zoom: 1, position: { x: 0, y: 0 } },

  selectedNodeIds: [],
  selectedNodeId: null,
  selectedEdgeId: null,

  // --- 검색 / 필터 ---
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  showSearch: false,
  setShowSearch: (show) => set({ showSearch: show }),
  envFilter: 'all' as const,
  setEnvFilter: (env) => set({ envFilter: env }),

  // --- 표시 설정 ---
  displaySettings: { ...DEFAULT_DISPLAY_SETTINGS },

  updateDisplaySettings: (settings) => {
    set(state => ({
      displaySettings: { ...state.displaySettings, ...settings },
    }));
  },

  // --- 히스토리 ---
  history: [{ nodes: [], edges: [], zones: [] }],
  historyIndex: 0,

  pushHistory: () => {
    const state = get();
    const snapshot = takeSnapshot(state);
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    set({
      nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
      edges: JSON.parse(JSON.stringify(snapshot.edges)),
      zones: JSON.parse(JSON.stringify(snapshot.zones)),
      historyIndex: newIndex,
      selectedNodeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    set({
      nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
      edges: JSON.parse(JSON.stringify(snapshot.edges)),
      zones: JSON.parse(JSON.stringify(snapshot.zones)),
      historyIndex: newIndex,
      selectedNodeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  // --- 노드 ---
  addNode: (variant, position, parentId) => {
    const id = `node-${uuidv4().slice(0, 8)}`;
    const isContainer = isContainerVariant(variant);
    const node: InfraNode = {
      id,
      type: isContainer ? 'containerNode' : 'serverNode',
      position,
      data: createDefaultServerData(variant),
      ...(parentId ? { parentId } : {}),
      ...(isContainer
        ? { style: CONTAINER_DEFAULT_SIZE[variant] ?? { width: 500, height: 400 } }
        : {}),
    };
    get().pushHistory();
    set(state => ({ nodes: [...state.nodes, node] }));
    return id;
  },

  updateNode: (id, data) => {
    get().pushHistory();
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  deleteNode: (id) => {
    get().pushHistory();
    // 컨테이너 삭제 시 자식 노드의 parentId를 해제
    set(state => {
      const newIds = state.selectedNodeIds.filter(nid => nid !== id);
      return {
        nodes: state.nodes
          .filter(n => n.id !== id)
          .map(n => n.parentId === id ? { ...n, parentId: undefined } : n),
        edges: state.edges.filter(e => e.source !== id && e.target !== id),
        selectedNodeIds: newIds,
        selectedNodeId: newIds[0] ?? null,
      };
    });
  },

  updateNodePosition: (id, position) => {
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === id ? { ...n, position } : n
      ),
    }));
  },

  // --- 컨테이너/부모-자식 ---
  setNodeParent: (nodeId, parentId) => {
    get().pushHistory();
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId
          ? { ...n, parentId: parentId ?? undefined }
          : n
      ),
    }));
  },

  resizeContainer: (id, width, height) => {
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === id
          ? { ...n, style: { ...n.style, width, height } }
          : n
      ),
    }));
  },

  getChildNodes: (parentId) => {
    return get().nodes.filter(n => n.parentId === parentId);
  },

  // --- 엣지 ---
  addEdge: (source, target, sourceServiceId?, targetServiceId?) => {
    const id = `edge-${uuidv4().slice(0, 8)}`;
    const defaultData = createDefaultEdgeData();
    const edge: InfraEdge = {
      id,
      source,
      target,
      type: 'infraEdge',
      data: {
        ...defaultData,
        ...(sourceServiceId ? { sourceServiceId } : {}),
        ...(targetServiceId ? { targetServiceId } : {}),
      },
    };
    get().pushHistory();
    set(state => ({ edges: [...state.edges, edge] }));
    return id;
  },

  updateEdge: (id, data) => {
    get().pushHistory();
    set(state => ({
      edges: state.edges.map(e =>
        e.id === id ? { ...e, data: { ...e.data, ...data } } : e
      ),
    }));
  },

  deleteEdge: (id) => {
    get().pushHistory();
    set(state => ({
      edges: state.edges.filter(e => e.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    }));
  },

  // --- 존 (레거시 호환) ---
  addZone: (label, position) => {
    const id = `zone-${uuidv4().slice(0, 8)}`;
    const zone: Zone = {
      id,
      label,
      color: '#E3F2FD',
      position,
      size: { width: 600, height: 400 },
    };
    get().pushHistory();
    set(state => ({ zones: [...state.zones, zone] }));
    return id;
  },

  updateZone: (id, updates) => {
    get().pushHistory();
    set(state => ({
      zones: state.zones.map(z =>
        z.id === id ? { ...z, ...updates } : z
      ),
    }));
  },

  deleteZone: (id) => {
    get().pushHistory();
    set(state => ({
      zones: state.zones.filter(z => z.id !== id),
    }));
  },

  // --- 선택 ---
  selectNode: (id) => set({ selectedNodeIds: id ? [id] : [], selectedNodeId: id, selectedEdgeId: null }),
  toggleNodeSelection: (id) => {
    set(state => {
      const ids = state.selectedNodeIds;
      const next = ids.includes(id) ? ids.filter(nid => nid !== id) : [...ids, id];
      return { selectedNodeIds: next, selectedNodeId: next[0] ?? null, selectedEdgeId: null };
    });
  },
  selectMultipleNodes: (ids) => set({ selectedNodeIds: ids, selectedNodeId: ids[0] ?? null, selectedEdgeId: null }),
  deleteSelectedNodes: () => {
    const state = get();
    const ids = state.selectedNodeIds;
    if (ids.length === 0) return;
    state.pushHistory();
    const idSet = new Set(ids);
    set(s => ({
      nodes: s.nodes
        .filter(n => !idSet.has(n.id))
        .map(n => n.parentId && idSet.has(n.parentId) ? { ...n, parentId: undefined } : n),
      edges: s.edges.filter(e => !idSet.has(e.source) && !idSet.has(e.target)),
      selectedNodeIds: [],
      selectedNodeId: null,
    }));
  },
  alignSelectedNodes: (direction) => {
    const state = get();
    const ids = state.selectedNodeIds;
    if (ids.length < 2) return;
    const selected = state.nodes.filter(n => ids.includes(n.id));
    if (selected.length < 2) return;

    state.pushHistory();

    let updater: (n: InfraNode) => { x: number; y: number };

    switch (direction) {
      case 'left': {
        const minX = Math.min(...selected.map(n => n.position.x));
        updater = (n) => ({ ...n.position, x: minX });
        break;
      }
      case 'right': {
        const maxX = Math.max(...selected.map(n => n.position.x));
        updater = (n) => ({ ...n.position, x: maxX });
        break;
      }
      case 'center': {
        const avgX = selected.reduce((sum, n) => sum + n.position.x, 0) / selected.length;
        updater = (n) => ({ ...n.position, x: Math.round(avgX) });
        break;
      }
      case 'top': {
        const minY = Math.min(...selected.map(n => n.position.y));
        updater = (n) => ({ ...n.position, y: minY });
        break;
      }
      case 'bottom': {
        const maxY = Math.max(...selected.map(n => n.position.y));
        updater = (n) => ({ ...n.position, y: maxY });
        break;
      }
      case 'middle': {
        const avgY = selected.reduce((sum, n) => sum + n.position.y, 0) / selected.length;
        updater = (n) => ({ ...n.position, y: Math.round(avgY) });
        break;
      }
    }

    const idSet = new Set(ids);
    set(s => ({
      nodes: s.nodes.map(n => idSet.has(n.id) ? { ...n, position: updater(n) } : n),
    }));
  },
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeIds: [], selectedNodeId: null }),

  // --- 그리드 ---
  gridEnabled: false,
  gridSize: 20,
  toggleGrid: () => set(state => ({ gridEnabled: !state.gridEnabled })),
  setGridSize: (size) => set({ gridSize: size }),

  // --- 캔버스 ---
  setCanvas: (canvas) => set(state => ({ canvas: { ...state.canvas, ...canvas } })),

  // --- 저장/불러오기 ---
  exportDiagram: () => {
    const { nodes, edges, zones, canvas, displaySettings } = get();
    return {
      version: '1.0',
      canvas,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      zones: JSON.parse(JSON.stringify(zones)),
      displaySettings: { ...displaySettings },
    };
  },

  importDiagram: (data) => {
    set({
      nodes: data.nodes || [],
      edges: data.edges || [],
      zones: data.zones || [],
      canvas: data.canvas || { zoom: 1, position: { x: 0, y: 0 } },
      displaySettings: data.displaySettings
        ? { ...DEFAULT_DISPLAY_SETTINGS, ...data.displaySettings }
        : { ...DEFAULT_DISPLAY_SETTINGS },
      selectedNodeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      searchQuery: '',
      showSearch: false,
      envFilter: 'all' as const,
      history: [{ nodes: data.nodes || [], edges: data.edges || [], zones: data.zones || [] }],
      historyIndex: 0,
    });
  },

  clearDiagram: () => {
    set({
      nodes: [],
      edges: [],
      zones: [],
      selectedNodeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      searchQuery: '',
      showSearch: false,
      envFilter: 'all' as const,
      history: [{ nodes: [], edges: [], zones: [] }],
      historyIndex: 0,
    });
  },
}));
