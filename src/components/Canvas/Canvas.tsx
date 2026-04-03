import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  SelectionMode,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnSelectionChangeFunc,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';

import ServerNode from '../Nodes/ServerNode';
import ContainerNode from '../Nodes/ContainerNode';
import InfraEdgeComponent from '../Edges/InfraEdge';
import SearchOverlay, { nodeMatchesQuery } from '../Layout/SearchOverlay';
import { useStore } from '../../store/useStore';
import type {
  NodeVariant,
  ServerData,
  EdgeData,
  InfraNode,
} from '../../types';
import { isContainerVariant } from '../../types';

// ---------------------------------------------------------------------------
// Custom node/edge type registrations -- MUST be outside the component
// to avoid re-registration on every render.
// ---------------------------------------------------------------------------
const nodeTypes = { serverNode: ServerNode, containerNode: ContainerNode };
const edgeTypes = { infraEdge: InfraEdgeComponent };

// ---------------------------------------------------------------------------
// Nesting priority: lower number = higher in hierarchy.
// A container can only be placed inside a container with a LOWER number.
// ---------------------------------------------------------------------------
const NESTING_PRIORITY: Record<string, number> = {
  zone: 0,
  firewall: 1,
  vm: 2,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute absolute canvas position of a node (walking up the parent chain). */
function getAbsolutePosition(
  node: InfraNode,
  allNodes: InfraNode[],
): { x: number; y: number } {
  let pos = { ...node.position };
  let current: InfraNode = node;
  while (current.parentId) {
    const parent = allNodes.find((n) => n.id === current.parentId);
    if (!parent) break;
    pos.x += parent.position.x;
    pos.y += parent.position.y;
    current = parent;
  }
  return pos;
}

/**
 * Get the absolute position of a container, taking nesting into account.
 * This differs from getAbsolutePosition in that it works for containers
 * that are themselves children of other containers.
 */
function getContainerAbsoluteBounds(
  container: InfraNode,
  allNodes: InfraNode[],
): { x: number; y: number; w: number; h: number } {
  const absPos = getAbsolutePosition(container, allNodes);
  const w = container.style?.width ?? 500;
  const h = container.style?.height ?? 400;
  return { x: absPos.x, y: absPos.y, w, h };
}

/** Check whether a point (absolute coordinates) falls inside a container (absolute bounds). */
function isInsideContainerAbs(
  pos: { x: number; y: number },
  containerBounds: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    pos.x > containerBounds.x &&
    pos.x < containerBounds.x + containerBounds.w &&
    pos.y > containerBounds.y &&
    pos.y < containerBounds.y + containerBounds.h
  );
}

/**
 * Collect all descendant node IDs of a given container (recursive).
 * Used to prevent circular nesting.
 */
function getDescendantIds(nodeId: string, allNodes: InfraNode[]): Set<string> {
  const ids = new Set<string>();
  const stack = allNodes.filter((n) => n.parentId === nodeId);
  while (stack.length > 0) {
    const child = stack.pop()!;
    ids.add(child.id);
    const grandchildren = allNodes.filter((n) => n.parentId === child.id);
    stack.push(...grandchildren);
  }
  return ids;
}

/**
 * Check whether `nodeVariant` is allowed inside `containerVariant` per the
 * nesting hierarchy:
 *   zone > firewall > vm > server-like nodes
 */
function canNestInside(
  nodeVariant: NodeVariant,
  containerVariant: NodeVariant,
): boolean {
  const isNodeContainer = isContainerVariant(nodeVariant);
  if (!isNodeContainer) {
    // Non-container (server-like) nodes can go inside any container.
    return true;
  }
  // Container inside container — only if parent priority < child priority.
  const parentPri = NESTING_PRIORITY[containerVariant];
  const childPri = NESTING_PRIORITY[nodeVariant];
  if (parentPri === undefined || childPri === undefined) return false;
  return parentPri < childPri;
}

/**
 * Given a list of candidate containers (sorted deepest-first), find the
 * best (innermost valid) container to reparent `node` into.
 */
function findBestContainer(
  absPos: { x: number; y: number },
  nodeId: string,
  nodeVariant: NodeVariant,
  allNodes: InfraNode[],
): InfraNode | null {
  // Collect containers sorted by nesting depth (deepest first) so we
  // match the most specific (innermost) container first.
  const containers = allNodes
    .filter((n) => n.type === 'containerNode' && n.id !== nodeId)
    .map((c) => ({
      node: c,
      bounds: getContainerAbsoluteBounds(c, allNodes),
      depth: (() => {
        let d = 0;
        let cur: InfraNode = c;
        while (cur.parentId) {
          d++;
          const p = allNodes.find((nn) => nn.id === cur.parentId);
          if (!p) break;
          cur = p;
        }
        return d;
      })(),
    }))
    .sort((a, b) => b.depth - a.depth); // deepest first

  const descendants = getDescendantIds(nodeId, allNodes);

  for (const { node: candidate, bounds } of containers) {
    if (descendants.has(candidate.id)) continue; // prevent circular
    if (!isInsideContainerAbs(absPos, bounds)) continue;
    if (!canNestInside(nodeVariant, candidate.data.nodeVariant)) continue;
    return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sort helper: React Flow requires parent nodes to appear BEFORE children
// in the node array.
// ---------------------------------------------------------------------------
function sortNodesForRF(nodes: InfraNode[]): InfraNode[] {
  // Build an order map: id -> topological order
  const sorted: InfraNode[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function visit(n: InfraNode) {
    if (visited.has(n.id)) return;
    visited.add(n.id);
    // Visit parent first (if any)
    if (n.parentId) {
      const parent = nodeMap.get(n.parentId);
      if (parent) visit(parent);
    }
    sorted.push(n);
  }

  // Visit root-level containers first, then root-level non-containers,
  // then everything else (children will be pulled in by visit()).
  const rootContainers = nodes.filter(
    (n) => !n.parentId && n.type === 'containerNode',
  );
  const rootNonContainers = nodes.filter(
    (n) => !n.parentId && n.type !== 'containerNode',
  );
  const children = nodes.filter((n) => !!n.parentId);

  for (const n of rootContainers) visit(n);
  for (const n of rootNonContainers) visit(n);
  for (const n of children) visit(n);

  return sorted;
}

// ---------------------------------------------------------------------------
// Canvas Component
// ---------------------------------------------------------------------------
export default function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // --- Zustand store selectors ---
  const storeNodes = useStore((s) => s.nodes);
  const storeEdges = useStore((s) => s.edges);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);

  const addNode = useStore((s) => s.addNode);
  const addEdge = useStore((s) => s.addEdge);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const deleteSelectedNodes = useStore((s) => s.deleteSelectedNodes);
  const updateNodePosition = useStore((s) => s.updateNodePosition);
  const selectNode = useStore((s) => s.selectNode);
  const toggleNodeSelection = useStore((s) => s.toggleNodeSelection);
  const selectMultipleNodes = useStore((s) => s.selectMultipleNodes);
  const selectEdge = useStore((s) => s.selectEdge);
  const pushHistory = useStore((s) => s.pushHistory);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setNodeParent = useStore((s) => s.setNodeParent);

  // --- Grid settings ---
  const gridEnabled = useStore((s) => s.gridEnabled);
  const gridSize = useStore((s) => s.gridSize);

  // --- Search / Filter ---
  const searchQuery  = useStore((s) => s.searchQuery);
  const showSearch   = useStore((s) => s.showSearch);
  const envFilter    = useStore((s) => s.envFilter);
  const setShowSearch = useStore((s) => s.setShowSearch);
  const setSearchQuery = useStore((s) => s.setSearchQuery);

  // --- Map InfraNode[] -> React Flow Node[] (sorted for parent-before-child) ---
  const rfNodes: Node<ServerData>[] = useMemo(() => {
    const selectedSet = new Set(selectedNodeIds);
    const sorted = sortNodesForRF(storeNodes);

    // Determine which IDs pass the combined search + env filter
    // For container nodes: show them if any of their children (or descendants) match.
    const isSearchActive = searchQuery.trim().length > 0;
    const isEnvActive    = envFilter !== 'all';

    // Pre-compute per-node visibility (ignoring container logic)
    const nodeVisible = new Map<string, boolean>();
    for (const n of storeNodes) {
      const passesSearch = !isSearchActive || nodeMatchesQuery(n, searchQuery);
      const passesEnv    = !isEnvActive    || n.data.env === envFilter || n.type === 'containerNode';
      nodeVisible.set(n.id, passesSearch && passesEnv);
    }

    // For container nodes, they are considered visible if they themselves pass
    // OR if any descendant passes (so they don't disappear while children are shown).
    const anyDescendantVisible = (nodeId: string): boolean => {
      const children = storeNodes.filter((c) => c.parentId === nodeId);
      for (const child of children) {
        if (nodeVisible.get(child.id)) return true;
        if (child.type === 'containerNode' && anyDescendantVisible(child.id)) return true;
      }
      return false;
    };

    const isFilterActive = isSearchActive || isEnvActive;

    return sorted.map((n) => {
      let visible = nodeVisible.get(n.id) ?? true;
      // Container nodes stay visible if any descendant is visible
      if (n.type === 'containerNode' && !visible && isFilterActive) {
        visible = anyDescendantVisible(n.id);
      }

      const dimmed = isFilterActive && !visible;
      const isMatch = isFilterActive && visible && n.type !== 'containerNode';

      // Only apply filter-related styles when a filter is actually active
      const filterStyle = isFilterActive
        ? {
            opacity: dimmed ? 0.15 : 1,
            transition: 'opacity 0.2s',
            boxShadow: isMatch
              ? '0 0 0 3px #3B82F6, 0 0 12px 2px rgba(59,130,246,0.4)'
              : undefined,
            borderRadius: isMatch ? '8px' : undefined,
          }
        : {};

      return {
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        parentId: n.parentId,
        selected: selectedSet.has(n.id),
        style: {
          ...n.style,
          ...filterStyle,
        },
        // Containers should NOT be constrained to their parent's bounds — they
        // are resizable and may intentionally overflow. Non-container children
        // should be constrained within their parent.
        extent:
          n.type === 'containerNode'
            ? undefined
            : n.parentId
              ? ('parent' as const)
              : undefined,
        expandParent: n.type !== 'containerNode' && !!n.parentId,
      };
    });
  }, [storeNodes, selectedNodeIds, searchQuery, envFilter]);

  // --- Map InfraEdge[] -> React Flow Edge[] ---
  // When sourceServiceId/targetServiceId is set, route the edge through
  // the per-service handles so the line connects at the service row.
  const rfEdges: Edge<EdgeData>[] = useMemo(
    () =>
      storeEdges.map((e) => {
        const srcSvcId = e.data?.sourceServiceId;
        const tgtSvcId = e.data?.targetServiceId;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          data: e.data,
          selected: e.id === selectedEdgeId,
          // Route through service-level handles when linked
          sourceHandle: srcSvcId ? `svc-${srcSvcId}-out` : undefined,
          targetHandle: tgtSvcId ? `svc-${tgtSvcId}-in` : undefined,
        };
      }),
    [storeEdges, selectedEdgeId],
  );

  // --- Handlers ---

  /** Propagate React Flow node changes (drag, select, remove, etc.) back to store */
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
      }
    },
    [updateNodePosition],
  );

  /**
   * Handle drag-end: push undo history AND perform reparenting logic.
   *
   * When a node finishes being dragged we determine whether it should be
   * reparented into a container, moved to a different container, or
   * detached from its current parent.
   */
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      pushHistory();

      // Get the full store state for position calculations
      const allNodes = useStore.getState().nodes;
      const draggedNode = allNodes.find((n) => n.id === node.id);
      if (!draggedNode) {
        updateNodePosition(node.id, node.position);
        return;
      }

      // Compute the node's absolute position (React Flow gives relative
      // positions when the node has a parentId).
      const absPos = getAbsolutePosition(
        { ...draggedNode, position: node.position },
        allNodes,
      );

      // Find the best container to drop into
      const bestContainer = findBestContainer(
        absPos,
        node.id,
        draggedNode.data.nodeVariant,
        allNodes,
      );

      const currentParentId = draggedNode.parentId ?? null;
      const newParentId = bestContainer?.id ?? null;

      if (newParentId !== currentParentId) {
        if (newParentId) {
          // Reparent into a (possibly different) container.
          // Convert absolute position to a position relative to the new parent.
          const parentAbsPos = getAbsolutePosition(bestContainer!, allNodes);
          const relativePos = {
            x: absPos.x - parentAbsPos.x,
            y: absPos.y - parentAbsPos.y,
          };
          updateNodePosition(node.id, relativePos);
          setNodeParent(node.id, newParentId);
        } else {
          // Detach from parent — convert to absolute position.
          updateNodePosition(node.id, absPos);
          setNodeParent(node.id, null);
        }
      } else {
        // Same parent (or no parent) — just sync position.
        updateNodePosition(node.id, node.position);
      }
    },
    [pushHistory, updateNodePosition, setNodeParent],
  );

  /** Propagate edge changes */
  const onEdgesChange: OnEdgesChange = useCallback((_changes) => {
    // Edge removals are handled via Delete key below.
  }, []);

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

  /** Select node on click (Ctrl/Meta = toggle multi-select) */
  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      if (event.ctrlKey || event.metaKey) {
        toggleNodeSelection(node.id);
      } else {
        selectNode(node.id);
      }
    },
    [selectNode, toggleNodeSelection],
  );

  /** Handle React Flow built-in box selection changes */
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length > 0) {
        selectMultipleNodes(selectedNodes.map((n) => n.id));
      }
    },
    [selectMultipleNodes],
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

      // Check if the drop position falls inside an existing container
      const allNodes = useStore.getState().nodes;
      const container = findBestContainer(
        position,
        '', // no node ID yet — new node
        variant,
        allNodes,
      );

      let finalPosition = position;
      let parentId: string | undefined;

      if (container) {
        // Convert drop position from absolute to relative-to-container
        const parentAbsPos = getAbsolutePosition(container, allNodes);
        finalPosition = {
          x: position.x - parentAbsPos.x,
          y: position.y - parentAbsPos.y,
        };
        parentId = container.id;
      }

      const newNodeId = addNode(variant, finalPosition, parentId);
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

      // Delete selected nodes or edge
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const currentSelectedNodes = useStore.getState().selectedNodeIds;
        const currentSelectedEdge = useStore.getState().selectedEdgeId;
        if (currentSelectedNodes.length > 0) {
          deleteSelectedNodes();
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

      // Ctrl+F = Toggle search overlay
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const current = useStore.getState().showSearch;
        if (current) {
          useStore.getState().setSearchQuery('');
          useStore.getState().setShowSearch(false);
        } else {
          useStore.getState().setSearchQuery('');
          useStore.getState().setShowSearch(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNodes, deleteEdge, undo, redo]);

  // --- Render ---

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      {/* Search overlay — floats above the canvas */}
      {showSearch && <SearchOverlay />}

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
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        snapToGrid={gridEnabled}
        snapGrid={[gridSize, gridSize]}
        fitView
        deleteKeyCode={null} // We handle delete ourselves
        className="bg-gray-50"
      >
        {gridEnabled ? (
          <Background variant={BackgroundVariant.Lines} gap={gridSize} size={1} color="#e0e0e0" />
        ) : (
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        )}
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
