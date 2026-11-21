import { GraphEdgeData, GraphMode, GraphNodeData } from '../types/evidenceos';

/**
 * Deterministic MultiDiGraph engine compatible with Python NetworkX (networkx.MultiDiGraph).
 * Computes identical, reproducible node coordinates and graph topology metrics so
 * Cytoscape.js renders the exact same spatial layout across Overview, Evidence Network,
 * and Transaction Investigation without random force-directed jitter.
 */

export interface PositionedGraphNode extends GraphNodeData {
  position: { x: number; y: number };
  inDegree: number;
  outDegree: number;
  degreeCentrality: number;
}

/**
 * Canonical anchor coordinates for Kaveri Textiles entities & supporting evidence nodes.
 * Every shared entity keeps the EXACT same (x, y) coordinates in both Evidence mode and
 * Transaction mode so switching views never scrambles or moves entities.
 */
const CANONICAL_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  // Primary MSME Subject (Center)
  'BUS-KAVERI': { x: 0, y: 0 },

  // Customers (Left Arc — exact same coordinates in Evidence & Transaction views)
  'CUST-SELVAM': { x: -410, y: -210 },
  'CUST-KUMAR': { x: -460, y: 10 },
  'CUST-MURUGAN': { x: -390, y: 230 },

  // Circular-Flow Suppliers (Right Triangle with BUS-KAVERI for unmistakable A -> B -> C -> A visibility)
  'SUP-CAUVERY': { x: 380, y: -155 },
  'SUP-TRICHY': { x: 380, y: 155 },

  // Lender (Bottom Center — exact same coordinates in Evidence & Transaction views)
  'LEND-SIDBI': { x: 20, y: 310 },

  // Supporting Evidence / Document Nodes (Evidence Knowledge Graph layer only)
  'STMT-SBI-NOV': { x: -160, y: -235 },
  'DOC-PNL-26': { x: 145, y: -255 },
  'INV-001': { x: -230, y: -75 },
  'TXN-8841': { x: -230, y: 75 },
  'WA-MSG-01': { x: -465, y: -115 },
  'DOC-LEDGER-14': { x: -230, y: 205 },
  'DOC-LOAN-SIDBI': { x: -175, y: 310 },
};

function deterministicHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export type NodePositionMap = Record<string, { x: number; y: number }>;

export function getCanonicalPositionForNode(
  nodeId: string,
  dynamicIndex: number = 0
): { x: number; y: number } {
  const canonical = CANONICAL_NODE_POSITIONS[nodeId];
  if (canonical) return canonical;
  const h = deterministicHash(nodeId);
  const angle = ((dynamicIndex * 47 + (h % 360)) * Math.PI) / 180;
  const radius = 520 + (dynamicIndex % 2) * 70;
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
  };
}

/**
 * Builds deterministic node coordinates + NetworkX-compatible degree metrics for Cytoscape.js.
 * Any user-saved coordinates in savedPositions take priority over canonical defaults.
 */
export function buildDeterministicGraphLayout(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  _mode: GraphMode,
  savedPositions?: NodePositionMap
): PositionedGraphNode[] {
  const inCount = new Map<string, number>();
  const outCount = new Map<string, number>();

  for (const n of nodes) {
    inCount.set(n.id, 0);
    outCount.set(n.id, 0);
  }

  for (const e of edges) {
    if (outCount.has(e.source)) {
      outCount.set(e.source, (outCount.get(e.source) || 0) + 1);
    }
    if (inCount.has(e.target)) {
      inCount.set(e.target, (inCount.get(e.target) || 0) + 1);
    }
  }

  const maxPossible = Math.max(1, nodes.length - 1);
  let dynamicIndex = 0;

  return nodes.map((n) => {
    const saved = savedPositions?.[n.id];
    let pos: { x: number; y: number };
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      pos = { x: saved.x, y: saved.y };
    } else if (CANONICAL_NODE_POSITIONS[n.id]) {
      pos = CANONICAL_NODE_POSITIONS[n.id];
    } else {
      pos = getCanonicalPositionForNode(n.id, dynamicIndex);
      dynamicIndex += 1;
    }

    const inDeg = inCount.get(n.id) || 0;
    const outDeg = outCount.get(n.id) || 0;
    const degreeCentrality = Number(Math.min(1, (inDeg + outDeg) / maxPossible).toFixed(2));

    return {
      ...n,
      position: pos,
      inDegree: inDeg,
      outDegree: outDeg,
      degreeCentrality,
    };
  });
}
