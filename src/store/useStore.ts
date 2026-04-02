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
  createDefaultServerData,
  createDefaultEdgeData,
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
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // --- 히스토리 (Undo/Redo) ---
  history: Snapshot[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // --- 노드 CRUD ---
  addNode: (variant: NodeVariant, position: { x: number; y: number }) => string;
  updateNode: (id: string, data: Partial<ServerData>) => void;
  deleteNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;

  // --- 엣지 CRUD ---
  addEdge: (source: string, target: string) => string;
  updateEdge: (id: string, data: Partial<EdgeData>) => void;
  deleteEdge: (id: string) => void;

  // --- 존 CRUD ---
  addZone: (label: string, position: { x: number; y: number }) => string;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  deleteZone: (id: string) => void;

  // --- 선택 ---
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;

  // --- 캔버스 ---
  setCanvas: (canvas: Partial<CanvasState>) => void;

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

  selectedNodeId: null,
  selectedEdgeId: null,

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
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  // --- 노드 ---
  addNode: (variant, position) => {
    const id = `node-${uuidv4().slice(0, 8)}`;
    const node: InfraNode = {
      id,
      type: 'serverNode',
      position,
      data: createDefaultServerData(variant),
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
    set(state => ({
      nodes: state.nodes.filter(n => n.id !== id),
      edges: state.edges.filter(e => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  updateNodePosition: (id, position) => {
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === id ? { ...n, position } : n
      ),
    }));
  },

  // --- 엣지 ---
  addEdge: (source, target) => {
    const id = `edge-${uuidv4().slice(0, 8)}`;
    const edge: InfraEdge = {
      id,
      source,
      target,
      type: 'infraEdge',
      data: createDefaultEdgeData(),
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

  // --- 존 ---
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
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  // --- 캔버스 ---
  setCanvas: (canvas) => set(state => ({ canvas: { ...state.canvas, ...canvas } })),

  // --- 저장/불러오기 ---
  exportDiagram: () => {
    const { nodes, edges, zones, canvas } = get();
    return {
      version: '1.0',
      canvas,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      zones: JSON.parse(JSON.stringify(zones)),
    };
  },

  importDiagram: (data) => {
    set({
      nodes: data.nodes || [],
      edges: data.edges || [],
      zones: data.zones || [],
      canvas: data.canvas || { zoom: 1, position: { x: 0, y: 0 } },
      selectedNodeId: null,
      selectedEdgeId: null,
      history: [{ nodes: data.nodes || [], edges: data.edges || [], zones: data.zones || [] }],
      historyIndex: 0,
    });
  },

  clearDiagram: () => {
    set({
      nodes: [],
      edges: [],
      zones: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      history: [{ nodes: [], edges: [], zones: [] }],
      historyIndex: 0,
    });
  },
}));
