import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';

import ServerNode from '../Nodes/ServerNode';
import InfraEdgeComponent from '../Edges/InfraEdge';
import { useStore } from '../../store/useStore';
import type { NodeVariant, ServerData, EdgeData } from '../../types';

// ---------------------------------------------------------------------------
// Custom node/edge type registrations -- MUST be outside the component
// to avoid re-registration on every render.
// ---------------------------------------------------------------------------
const nodeTypes = { serverNode: ServerNode };
const edgeTypes = { infraEdge: InfraEdgeComponent };

// ---------------------------------------------------------------------------
// Canvas Component
// ---------------------------------------------------------------------------
export default function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // --- Zustand store selectors ---
  const storeNodes = useStore((s) => s.nodes);
  const storeEdges = useStore((s) => s.edges);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);

  const addNode = useStore((s) => s.addNode);
  const addEdge = useStore((s) => s.addEdge);
  const deleteNode = useStore((s) => s.deleteNode);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const updateNodePosition = useStore((s) => s.updateNodePosition);
  const selectNode = useStore((s) => s.selectNode);
  const selectEdge = useStore((s) => s.selectEdge);
  const pushHistory = useStore((s) => s.pushHistory);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  // --- Map InfraNode[] -> React Flow Node[] ---
  const rfNodes: Node<ServerData>[] = useMemo(
    () =>
      storeNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        parentId: n.parentId,
        selected: n.id === selectedNodeId,
      })),
    [storeNodes, selectedNodeId],
  );

  // --- Map InfraEdge[] -> React Flow Edge[] ---
  const rfEdges: Edge<EdgeData>[] = useMemo(
    () =>
      storeEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        data: e.data,
        selected: e.id === selectedEdgeId,
      })),
    [storeEdges, selectedEdgeId],
  );

  // --- Handlers ---

  /** Propagate React Flow node changes (drag, select, remove, etc.) back to store */
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // We handle position changes ourselves to sync with the store.
      // For removals we also handle via delete key -- but we still let
      // applyNodeChanges run so React Flow's internal state stays consistent.

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
      }

      // Let React Flow handle transient visual state via applyNodeChanges
      // by updating the store nodes directly for non-position changes.
      // However, since we derive rfNodes from the store, we only need
      // to update positions (done above). For 'remove' type changes we
      // handle via keyboard Delete key handler below.
    },
    [updateNodePosition],
  );

  /** Handle drag-end to push undo history for position changes */
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Push history after a drag completes so undo can revert position
      pushHistory();
      updateNodePosition(node.id, node.position);
    },
    [pushHistory, updateNodePosition],
  );

  /** Propagate edge changes */
  const onEdgesChange: OnEdgesChange = useCallback(
    (_changes) => {
      // Edge removals are handled via Delete key below.
      // We don't need to apply edge changes for now since edges
      // are fully controlled via the store.
    },
    [],
  );

  /** Create new edge on connection */
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newEdgeId = addEdge(connection.source, connection.target);
        selectEdge(newEdgeId);
      }
    },
    [addEdge, selectEdge],
  );

  /** Select node on click */
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  /** Select edge on click */
  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  /** Deselect everything on pane click */
  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // --- Drag and Drop from NodePalette ---

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const variant = event.dataTransfer.getData(
        'application/infra-node-type',
      ) as NodeVariant;
      if (!variant) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = addNode(variant, position);
      selectNode(newNodeId);
    },
    [screenToFlowPosition, addNode, selectNode],
  );

  // --- Keyboard shortcuts ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't intercept if user is typing in an input/textarea
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Delete selected node or edge
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const currentSelectedNode = useStore.getState().selectedNodeId;
        const currentSelectedEdge = useStore.getState().selectedEdgeId;
        if (currentSelectedNode) {
          deleteNode(currentSelectedNode);
        } else if (currentSelectedEdge) {
          deleteEdge(currentSelectedEdge);
        }
      }

      // Ctrl+Z = Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Shift+Z = Redo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteNode, deleteEdge, undo, redo]);

  // --- Render ---

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        deleteKeyCode={null} // We handle delete ourselves
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-white !border !border-gray-200 !rounded !shadow-sm"
        />
        <Controls
          className="!bg-white !border !border-gray-200 !rounded !shadow-sm"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
