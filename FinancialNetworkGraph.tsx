import React, { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import {
  Check,
  ChevronRight,
  ExternalLink,
  Filter,
  GitFork,
  Maximize2,
  Minimize2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  EvidenceVerificationCode,
  GraphEdgeData,
  GraphMode,
  GraphNodeData,
  GraphNodeType,
} from '../../types/evidenceos';
import { detectDirectedCycles, formatINR } from '../../utils/financialEngines';
import {
  buildDeterministicGraphLayout,
  getCanonicalPositionForNode,
  NodePositionMap,
} from '../../utils/graphEngine';

interface FinancialNetworkGraphProps {
  forcedMode?: GraphMode;
  heightClass?: string;
}

const NODE_STYLE_META: Record<
  GraphNodeType,
  { label: string; bg: string; border: string; shape: string; glyph: string }
> = {
  business: { label: 'Business', bg: '#104B32', border: '#104B32', shape: 'round-rectangle', glyph: 'B' },
  customer: { label: 'Customer', bg: '#176B45', border: '#104B32', shape: 'ellipse', glyph: 'C' },
  supplier: { label: 'Supplier', bg: '#2C5E4F', border: '#17231E', shape: 'hexagon', glyph: 'S' },
  invoice: { label: 'Invoice', bg: '#FFFFFF', border: '#176B45', shape: 'rectangle', glyph: 'INV' },
  bank_transaction: { label: 'Bank Txn', bg: '#F0F5F1', border: '#176B45', shape: 'diamond', glyph: 'TXN' },
  bank_statement: { label: 'Bank Stmt', bg: '#FFFFFF', border: '#17231E', shape: 'barrel', glyph: 'STM' },
  whatsapp_message: { label: 'WhatsApp', bg: '#DDEFE3', border: '#248451', shape: 'round-tag', glyph: 'WA' },
  financial_document: { label: 'Financial Doc', bg: '#FFFFFF', border: '#64746B', shape: 'cut-rectangle', glyph: 'DOC' },
};

const STATUS_LABEL: Record<EvidenceVerificationCode, { label: string; color: string }> = {
  CORROBORATED: { label: 'Corroborated', color: '#248451' },
  CONTRADICTED: { label: 'Contradicted', color: '#DC4545' },
  INSUFFICIENT_EVIDENCE: { label: 'Insufficient Evidence', color: '#D99124' },
  REQUIRES_MANUAL_REVIEW: { label: 'Manual Review', color: '#D99124' },
  POSSIBLE_ANOMALY: { label: 'Possible Anomaly', color: '#DC4545' },
};

export function FinancialNetworkGraph({
  forcedMode,
  heightClass = 'h-full',
}: FinancialNetworkGraphProps) {
  const {
    graphMode,
    setGraphMode,
    evidenceNodes,
    evidenceEdges,
    transactionNodes,
    transactionEdges,
    graphHighlight,
    setGraphHighlight,
    clearGraphHighlight,
    openDocumentInVerification,
    savedNodePositions,
    saveGraphPositions,
    resetSavedGraphPositions,
  } = useWorkspace();

  const activeMode = forcedMode ?? graphMode;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const [entitySearch, setEntitySearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'nov10_14' | 'nov15_19'>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdgeData | null>(null);
  const [collapsedBranchMode, setCollapsedBranchMode] = useState(false);
  const [hasUnsavedPositions, setHasUnsavedPositions] = useState(false);
  const [justSavedLayout, setJustSavedLayout] = useState(false);
  const pendingPositionsRef = useRef<NodePositionMap>({});

  const baseNodes = activeMode === 'evidence' ? evidenceNodes : transactionNodes;
  const baseEdges = activeMode === 'evidence' ? evidenceEdges : transactionEdges;

  const detectedCycles = useMemo(
    () => detectDirectedCycles(transactionEdges, 4),
    [transactionEdges]
  );

  const filteredData = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();

    const nodes = baseNodes.filter((n) => {
      if (entityTypeFilter !== 'all' && n.nodeType !== entityTypeFilter) return false;
      if (statusFilter !== 'all' && n.verificationStatus !== statusFilter) return false;
      if (q) {
        const match =
          n.label.toLowerCase().includes(q) ||
          n.identifier.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const edges = baseEdges.filter((e) => {
      if (!nodeIdSet.has(e.source) || !nodeIdSet.has(e.target)) return false;
      if (relationshipFilter !== 'all' && e.relationship !== relationshipFilter) return false;
      if (dateFilter !== 'all' && e.date) {
        if (dateFilter === 'nov10_14' && (e.date < '2026-11-10' || e.date > '2026-11-14')) {
          return false;
        }
        if (dateFilter === 'nov15_19' && (e.date < '2026-11-15' || e.date > '2026-11-19')) {
          return false;
        }
      }
      return true;
    });

    return { nodes, edges };
  }, [baseNodes, baseEdges, entitySearch, dateFilter, entityTypeFilter, statusFilter, relationshipFilter]);

  const allRelationships = useMemo(
    () => Array.from(new Set(baseEdges.map((e) => e.relationship))),
    [baseEdges]
  );

  const positionedNodes = useMemo(
    () =>
      buildDeterministicGraphLayout(
        filteredData.nodes,
        filteredData.edges,
        activeMode,
        savedNodePositions
      ),
    [filteredData.nodes, filteredData.edges, activeMode, savedNodePositions]
  );

  // Build Cytoscape elements with deterministic NetworkX-compatible preset coordinates
  useEffect(() => {
    if (!containerRef.current) return;

    const elements: ElementDefinition[] = [
      ...positionedNodes.map((n) => {
        const meta = NODE_STYLE_META[n.nodeType];
        const isDarkNode =
          n.nodeType === 'business' || n.nodeType === 'customer' || n.nodeType === 'supplier';
        const amountLine = n.amount ? `\n${formatINR(n.amount)}` : '';
        return {
          data: {
            id: n.id,
            label: `${n.label}${amountLine}`,
            nodeType: n.nodeType,
            bgColor: meta.bg,
            borderColor:
              n.verificationStatus === 'CONTRADICTED' || n.verificationStatus === 'POSSIBLE_ANOMALY'
                ? '#DC4545'
                : n.verificationStatus === 'REQUIRES_MANUAL_REVIEW'
                  ? '#D99124'
                  : meta.border,
            textColor: isDarkNode ? '#FFFFFF' : '#17231E',
            shape: meta.shape,
            verificationStatus: n.verificationStatus,
          },
          position: { x: n.position.x, y: n.position.y },
        };
      }),
      ...filteredData.edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.amount ? `${e.relationship} · ${formatINR(e.amount)}` : e.relationship,
          relationship: e.relationship,
          isCycle: e.isCycleEdge ? 'true' : 'false',
          isDiscrepancy: e.isDiscrepancyEdge ? 'true' : 'false',
          verificationStatus: e.verificationStatus,
        },
      })),
    ];

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      minZoom: 0.4,
      maxZoom: 2.4,
      wheelSensitivity: 0.25,
      style: [
        {
          selector: 'node',
          style: {
            shape: 'data(shape)' as any,
            'background-color': 'data(bgColor)',
            'border-width': 2,
            'border-color': 'data(borderColor)',
            color: 'data(textColor)',
            label: 'data(label)',
            'font-family': 'DM Sans, sans-serif',
            'font-size': 11,
            'font-weight': 600,
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '118px',
            width: 'label',
            height: 'label',
            padding: '12px',
            'overlay-opacity': 0,
            'transition-property': 'opacity, border-width, border-color',
            'transition-duration': 180,
          },
        },
        {
          selector: 'node[nodeType = "business"]',
          style: {
            'font-size': 12,
            'font-weight': 700,
            padding: '16px',
            'border-width': 2.5,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.8,
            'line-color': '#9FB6A7',
            'target-arrow-color': '#9FB6A7',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.9,
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': 9.5,
            color: '#4B5D54',
            'text-background-color': '#F7FAF8',
            'text-background-opacity': 0.92,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-rotation': 'autorotate',
            'transition-property': 'opacity, line-color, width',
            'transition-duration': 180,
          },
        },
        {
          selector: 'edge[verificationStatus = "CORROBORATED"]',
          style: {
            'line-color': '#248451',
            'target-arrow-color': '#248451',
          },
        },
        {
          selector: 'edge[verificationStatus = "REQUIRES_MANUAL_REVIEW"]',
          style: {
            'line-color': '#D99124',
            'target-arrow-color': '#D99124',
            'line-style': 'dashed',
          },
        },
        {
          selector: 'edge[isDiscrepancy = "true"]',
          style: {
            'line-color': '#DC4545',
            'target-arrow-color': '#DC4545',
            width: 2.6,
            color: '#B52B2B',
          },
        },
        {
          selector: 'edge[isCycle = "true"]',
          style: {
            'line-color': '#DC4545',
            'target-arrow-color': '#DC4545',
            width: 2.8,
            'line-style': 'solid',
            color: '#B52B2B',
          },
        },
        {
          selector: '.faded',
          style: {
            opacity: 0.2,
          },
        },
        {
          selector: '.highlighted',
          style: {
            opacity: 1,
            'border-width': 3.5,
            'border-color': '#176B45',
            'z-index': 20,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            opacity: 1,
            width: 3.2,
            'z-index': 20,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#104B32',
          },
        },
      ],
      layout: {
        name: 'preset',
        fit: true,
        padding: 44,
        animate: false,
      },
    });

    cy.on('tap', 'node', (evt) => {
      const id = evt.target.id();
      const found = filteredData.nodes.find((n) => n.id === id) || null;
      setSelectedEdge(null);
      setSelectedNode(found);
      setCollapsedBranchMode(false);

      cy.elements().removeClass('faded highlighted');
      const neighborhood = evt.target.closedNeighborhood();
      cy.elements().not(neighborhood).addClass('faded');
      neighborhood.addClass('highlighted');
    });

    cy.on('tap', 'edge', (evt) => {
      const id = evt.target.id();
      const found = filteredData.edges.find((e) => e.id === id) || null;
      setSelectedNode(null);
      setSelectedEdge(found);

      cy.elements().removeClass('faded highlighted');
      const related = evt.target.connectedNodes().union(evt.target);
      cy.elements().not(related).addClass('faded');
      related.addClass('highlighted');
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
        setCollapsedBranchMode(false);
        cy.elements().removeClass('faded highlighted');
        cy.elements().style('display', 'element');
      }
    });

    const initialPosById = new Map<string, { x: number; y: number }>(
      positionedNodes.map((n) => [n.id, n.position])
    );

    const markPositionsChanged = () => {
      const nextMap: NodePositionMap = {};
      let moved = false;
      cy.nodes().forEach((node) => {
        const pos = node.position();
        const rx = Math.round(pos.x * 10) / 10;
        const ry = Math.round(pos.y * 10) / 10;
        nextMap[node.id()] = { x: rx, y: ry };
        const orig = initialPosById.get(node.id());
        if (!orig || Math.abs(orig.x - rx) >= 0.5 || Math.abs(orig.y - ry) >= 0.5) {
          moved = true;
        }
      });
      pendingPositionsRef.current = nextMap;
      if (moved) {
        setHasUnsavedPositions(true);
        setJustSavedLayout(false);
      }
    };

    cy.on('drag', 'node', () => {
      setHasUnsavedPositions(true);
      setJustSavedLayout(false);
    });

    cy.on('dragfree', 'node', () => {
      markPositionsChanged();
    });

    cyRef.current = cy;
    setHasUnsavedPositions(false);

    // Fit cleanly after mount
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 38);
      }
    }, 40);

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [positionedNodes, filteredData.edges, filteredData.nodes, activeMode]);

  // Apply external highlight from Findings, Simulation, or AI Investigator
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('faded highlighted');
    cy.elements().style('display', 'element');

    if (graphHighlight.nodeIds.length === 0 && graphHighlight.edgeIds.length === 0) return;

    const matchedNodes = cy.nodes().filter((n) => graphHighlight.nodeIds.includes(n.id()));
    const matchedEdges = cy.edges().filter((e) => graphHighlight.edgeIds.includes(e.id()));
    const targetGroup = matchedNodes.union(matchedEdges).union(matchedEdges.connectedNodes());

    if (targetGroup.length > 0) {
      cy.elements().not(targetGroup).addClass('faded');
      targetGroup.addClass('highlighted');
      cy.animate({
        fit: { eles: targetGroup, padding: 65 },
        duration: 280,
      });
    }
  }, [graphHighlight, activeMode, filteredData]);

  const handleZoom = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: Math.max(0.4, Math.min(2.4, cy.zoom() * factor)),
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };

  const handleFit = () => {
    cyRef.current?.fit(undefined, 38);
  };

  const handleSavePositions = async () => {
    const cy = cyRef.current;
    if (!cy) return;
    const captured: NodePositionMap = {};
    cy.nodes().forEach((node) => {
      const pos = node.position();
      captured[node.id()] = {
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10,
      };
    });
    const toSave = Object.keys(captured).length > 0 ? captured : pendingPositionsRef.current;
    await saveGraphPositions(toSave);
    setHasUnsavedPositions(false);
    setJustSavedLayout(true);
    setTimeout(() => setJustSavedLayout(false), 2400);
  };

  const handleResetLayout = () => {
    const cy = cyRef.current;
    if (!cy) return;
    clearGraphHighlight();
    setSelectedNode(null);
    setSelectedEdge(null);
    setCollapsedBranchMode(false);
    setHasUnsavedPositions(false);
    setJustSavedLayout(false);
    resetSavedGraphPositions();
    cy.elements().removeClass('faded highlighted');
    cy.elements().style('display', 'element');
    const canonicalById = new Map<string, { x: number; y: number }>();
    filteredData.nodes.forEach((n, idx) => {
      canonicalById.set(n.id, getCanonicalPositionForNode(n.id, idx));
    });
    cy.layout({
      name: 'preset',
      positions: (node: any) => canonicalById.get(node.id()) || { x: 0, y: 0 },
      fit: true,
      padding: 44,
      animate: true,
      animationDuration: 260,
    }).run();
  };

  const handleHighlightCycles = () => {
    if (activeMode !== 'transactions' && !forcedMode) {
      setGraphMode('transactions');
    }
    const cycleEdgeIds = transactionEdges.filter((e) => e.isCycleEdge).map((e) => e.id);
    const cycleNodeIds = Array.from(
      new Set(
        transactionEdges
          .filter((e) => e.isCycleEdge)
          .flatMap((e) => [e.source, e.target])
      )
    );
    setGraphHighlight({
      nodeIds: cycleNodeIds,
      edgeIds: cycleEdgeIds,
      reasonLabel: `Circular path (${detectedCycles.length} loop detected): A → B → C → A`,
      source: 'cycle',
    });
  };

  const handleToggleCollapseBranch = () => {
    const cy = cyRef.current;
    if (!cy || !selectedNode) return;
    if (collapsedBranchMode) {
      cy.elements().style('display', 'element');
      setCollapsedBranchMode(false);
      cy.fit(undefined, 40);
    } else {
      const nodeEle = cy.getElementById(selectedNode.id);
      const neighborhood = nodeEle.closedNeighborhood();
      cy.elements().not(neighborhood).style('display', 'none');
      setCollapsedBranchMode(true);
      cy.fit(neighborhood, 60);
    }
  };

  const connectedEntitiesForSelected = useMemo(() => {
    if (!selectedNode) return [];
    return baseEdges
      .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
      .map((e) => {
        const otherId = e.source === selectedNode.id ? e.target : e.source;
        const otherNode = baseNodes.find((n) => n.id === otherId);
        return {
          edge: e,
          otherNode,
          direction: e.source === selectedNode.id ? 'outgoing' : 'incoming',
        };
      });
  }, [selectedNode, baseEdges, baseNodes]);

  return (
    <div
      className={`bg-white border border-[#DCE7DF] rounded-xl flex flex-col overflow-hidden relative ${heightClass}`}
    >
      {/* Compact Single-Row Graph Toolbar */}
      <div className="px-3.5 py-2.5 border-b border-[#DCE7DF] bg-white flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
        {/* Title + Mode Selector */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-[14px] text-[#17231E] leading-tight whitespace-nowrap">
              {activeMode === 'evidence'
                ? 'Financial Evidence Network'
                : 'Financial Transaction Graph'}
            </h2>
          </div>

          {!forcedMode && (
            <div className="inline-flex items-center p-0.5 bg-[#F0F5F1] border border-[#DCE7DF] rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => {
                  setGraphMode('evidence');
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeMode === 'evidence'
                    ? 'bg-white text-[#104B32] shadow-xs font-semibold'
                    : 'text-[#64746B] hover:text-[#17231E]'
                }`}
              >
                Evidence Relationships
              </button>
              <button
                type="button"
                onClick={() => {
                  setGraphMode('transactions');
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeMode === 'transactions'
                    ? 'bg-white text-[#104B32] shadow-xs font-semibold'
                    : 'text-[#64746B] hover:text-[#17231E]'
                }`}
              >
                Financial Transactions
              </button>
            </div>
          )}
        </div>

        {/* Search, Filters & Zoom Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#64746B] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Search entity..."
              className="h-8 w-36 pl-7 pr-2 text-xs bg-[#F7FAF8] border border-[#DCE7DF] rounded-lg text-[#17231E] placeholder:text-[#64746B] focus:outline-none focus:border-[#176B45]"
            />
          </div>

          <select
            aria-label="Date filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="h-8 px-2 text-xs bg-[#F7FAF8] border border-[#DCE7DF] rounded-lg text-[#17231E] focus:outline-none focus:border-[#176B45]"
          >
            <option value="all">All dates</option>
            <option value="nov10_14">Nov 10 – 14</option>
            <option value="nov15_19">Nov 15 – 19</option>
          </select>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterPopoverOpen((v) => !v)}
              className={`h-8 px-2.5 text-xs font-medium rounded-lg border inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                entityTypeFilter !== 'all' || statusFilter !== 'all' || relationshipFilter !== 'all'
                  ? 'bg-[#DDEFE3] border-[#176B45] text-[#104B32]'
                  : 'bg-[#F7FAF8] border-[#DCE7DF] text-[#17231E] hover:bg-[#F0F5F1]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>

            {filterPopoverOpen && (
              <div className="absolute right-0 top-9 w-64 bg-white border border-[#DCE7DF] rounded-xl shadow-lg p-3 z-40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#17231E]">Graph Filters</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEntityTypeFilter('all');
                      setStatusFilter('all');
                      setRelationshipFilter('all');
                      setDateFilter('all');
                    }}
                    className="text-[11px] text-[#176B45] hover:underline"
                  >
                    Reset all
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-[#64746B] mb-1">Entity type</label>
                  <select
                    value={entityTypeFilter}
                    onChange={(e) => setEntityTypeFilter(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-[#DCE7DF] rounded-lg bg-[#F7FAF8]"
                  >
                    <option value="all">All entity types</option>
                    {Object.entries(NODE_STYLE_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#64746B] mb-1">Relationship</label>
                  <select
                    value={relationshipFilter}
                    onChange={(e) => setRelationshipFilter(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-[#DCE7DF] rounded-lg bg-[#F7FAF8]"
                  >
                    <option value="all">All relationships</option>
                    {allRelationships.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#64746B] mb-1">Verification status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-[#DCE7DF] rounded-lg bg-[#F7FAF8]"
                  >
                    <option value="all">All statuses</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleHighlightCycles}
            className="h-8 px-2.5 text-xs font-medium rounded-lg border border-[#DCE7DF] bg-[#F7FAF8] hover:bg-[#F0F5F1] text-[#17231E] inline-flex items-center gap-1 transition-colors whitespace-nowrap"
            title="Highlight detected circular transaction path (A → B → C → A)"
          >
            <GitFork className="w-3.5 h-3.5 text-[#DC4545]" />
            <span className="hidden sm:inline">Cycles ({detectedCycles.length})</span>
          </button>

          {hasUnsavedPositions && (
            <button
              type="button"
              onClick={handleSavePositions}
              className="h-8 px-3 text-xs font-semibold rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Save adjusted node positions across all graph views"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}

          {justSavedLayout && !hasUnsavedPositions && (
            <span className="h-8 px-2.5 text-xs font-semibold text-[#248451] inline-flex items-center gap-1 whitespace-nowrap">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}

          <div className="inline-flex items-center border border-[#DCE7DF] rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => handleZoom(1.22)}
              className="h-8 w-8 flex items-center justify-center text-[#17231E] hover:bg-[#F0F5F1] border-r border-[#DCE7DF]"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(0.82)}
              className="h-8 w-8 flex items-center justify-center text-[#17231E] hover:bg-[#F0F5F1] border-r border-[#DCE7DF]"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFit}
              className="h-8 w-8 flex items-center justify-center text-[#17231E] hover:bg-[#F0F5F1] border-r border-[#DCE7DF]"
              title="Fit graph"
              aria-label="Fit graph"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetLayout}
              className="h-8 w-8 flex items-center justify-center text-[#17231E] hover:bg-[#F0F5F1]"
              title="Reset layout to default positions"
              aria-label="Reset layout"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Highlight Context Banner */}
      {graphHighlight.reasonLabel && (
        <div className="px-3.5 py-1.5 bg-[#F0F5F1] border-b border-[#DCE7DF] flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-[#104B32] font-medium min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#176B45] shrink-0" />
            <span className="truncate">{graphHighlight.reasonLabel}</span>
          </div>
          <button
            type="button"
            onClick={clearGraphHighlight}
            className="text-[11px] font-medium text-[#64746B] hover:text-[#17231E] inline-flex items-center gap-1 shrink-0"
          >
            Clear highlight
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Cytoscape Interactive Canvas */}
      <div className="relative flex-1 min-h-[420px] bg-[#FAFDFB]">
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
          aria-label="Interactive financial network graph canvas"
        />

        {/* Compact Bottom-Left Legend */}
        <div className="absolute bottom-3 left-3 bg-white/95 border border-[#DCE7DF] rounded-lg px-3 py-2 text-[11px] text-[#64746B] pointer-events-auto max-w-[92%] z-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-[#17231E]">Legend:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#104B32] inline-block" />
              Business
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#176B45] inline-block" />
              Customer / Supplier
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs border border-[#176B45] bg-white inline-block" />
              Invoice / Doc
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#248451] inline-block" />
              Corroborated
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#D99124] inline-block border-t border-dashed border-[#D99124]" />
              Review Needed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#DC4545] inline-block" />
              Discrepancy / Cycle
            </span>
          </div>
        </div>

        {/* Node or Edge Compact Slide-Over Inspector (inside graph viewport) */}
        {(selectedNode || selectedEdge) && (
          <div className="absolute top-3 right-3 bottom-3 w-80 max-w-[calc(100%-24px)] bg-white border border-[#DCE7DF] rounded-xl shadow-md flex flex-col overflow-hidden z-20">
            <div className="px-3.5 py-2.5 border-b border-[#DCE7DF] bg-[#F7FAF8] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#64746B]">
                  {selectedNode
                    ? NODE_STYLE_META[selectedNode.nodeType].label
                    : `Relationship · ${selectedEdge?.relationship}`}
                </div>
                <div className="font-display font-semibold text-sm text-[#17231E] truncate">
                  {selectedNode ? selectedNode.label : selectedEdge?.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                  setCollapsedBranchMode(false);
                  cyRef.current?.elements().removeClass('faded highlighted');
                  cyRef.current?.elements().style('display', 'element');
                }}
                className="p-1 text-[#64746B] hover:text-[#17231E] rounded"
                aria-label="Close inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
              {selectedNode && (
                <>
                  <div className="grid grid-cols-2 gap-2 pb-3 border-b border-[#DCE7DF]">
                    <div>
                      <div className="text-[11px] text-[#64746B]">Identifier</div>
                      <div className="font-mono-num font-medium text-[#17231E] mt-0.5">
                        {selectedNode.identifier}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#64746B]">Status</div>
                      <div
                        className="font-semibold mt-0.5"
                        style={{ color: STATUS_LABEL[selectedNode.verificationStatus].color }}
                      >
                        {STATUS_LABEL[selectedNode.verificationStatus].label}
                      </div>
                    </div>
                    {selectedNode.amount !== undefined && (
                      <div>
                        <div className="text-[11px] text-[#64746B]">Recorded Amount</div>
                        <div className="font-mono-num font-semibold text-[#17231E] mt-0.5">
                          {formatINR(selectedNode.amount)}
                        </div>
                      </div>
                    )}
                    {selectedNode.date && (
                      <div>
                        <div className="text-[11px] text-[#64746B]">Date</div>
                        <div className="font-mono-num text-[#17231E] mt-0.5">{selectedNode.date}</div>
                      </div>
                    )}
                    {(() => {
                      const metrics = positionedNodes.find((p) => p.id === selectedNode.id);
                      if (!metrics) return null;
                      return (
                        <div className="col-span-2 pt-1 flex items-center justify-between text-[11px] text-[#64746B] border-t border-[#DCE7DF]/60">
                          <span>Graph Topology (MultiDiGraph)</span>
                          <span className="font-mono-num text-[#17231E]">
                            In: {metrics.inDegree} · Out: {metrics.outDegree} · Centrality:{' '}
                            {metrics.degreeCentrality}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {selectedNode.metadata && (
                    <div className="space-y-1 pb-3 border-b border-[#DCE7DF]">
                      <div className="text-[11px] font-semibold text-[#17231E]">Entity Details</div>
                      {Object.entries(selectedNode.metadata).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-[#64746B] capitalize">
                            {k.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="font-medium text-[#17231E] text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Branch isolation control */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleCollapseBranch}
                      className="flex-1 py-1.5 px-2.5 rounded-lg border border-[#DCE7DF] bg-[#F7FAF8] hover:bg-[#F0F5F1] text-[#17231E] font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Minimize2 className="w-3.5 h-3.5 text-[#176B45]" />
                      <span>{collapsedBranchMode ? 'Expand full graph' : 'Isolate branch'}</span>
                    </button>
                    {selectedNode.sourceDocumentId && (
                      <button
                        type="button"
                        onClick={() => openDocumentInVerification(selectedNode.sourceDocumentId!)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>Source Doc</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Connected Entities */}
                  <div>
                    <div className="text-[11px] font-semibold text-[#17231E] mb-1.5">
                      Connected Relationships ({connectedEntitiesForSelected.length})
                    </div>
                    <div className="space-y-1.5">
                      {connectedEntitiesForSelected.map(({ edge, otherNode, direction }) => (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => {
                            if (otherNode) {
                              setSelectedNode(otherNode);
                              const targetEle = cyRef.current?.getElementById(otherNode.id);
                              if (targetEle && cyRef.current) {
                                cyRef.current.elements().removeClass('faded highlighted');
                                const hood = targetEle.closedNeighborhood();
                                cyRef.current.elements().not(hood).addClass('faded');
                                hood.addClass('highlighted');
                              }
                            }
                          }}
                          className="w-full p-2 rounded-lg border border-[#DCE7DF] hover:border-[#176B45] bg-[#FAFDFB] text-left transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono-num text-[10px] font-semibold text-[#176B45]">
                              {direction === 'outgoing' ? '→ ' : '← '}
                              {edge.relationship}
                            </span>
                            {edge.amount !== undefined && (
                              <span className="font-mono-num text-[11px] font-semibold text-[#17231E]">
                                {formatINR(edge.amount)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="font-medium text-[#17231E] truncate">
                              {otherNode?.label || edge.target}
                            </span>
                            <ChevronRight className="w-3 h-3 text-[#64746B] shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedEdge && (
                <>
                  <div className="space-y-2 pb-3 border-b border-[#DCE7DF]">
                    <div className="text-[#17231E] leading-relaxed">{selectedEdge.description}</div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <div className="text-[11px] text-[#64746B]">Status</div>
                        <div
                          className="font-semibold mt-0.5"
                          style={{ color: STATUS_LABEL[selectedEdge.verificationStatus].color }}
                        >
                          {STATUS_LABEL[selectedEdge.verificationStatus].label}
                        </div>
                      </div>
                      {selectedEdge.amount !== undefined && (
                        <div>
                          <div className="text-[11px] text-[#64746B]">Amount</div>
                          <div className="font-mono-num font-semibold text-[#17231E] mt-0.5">
                            {formatINR(selectedEdge.amount)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#17231E]">
                      Relationship Provenance
                    </div>
                    <div className="text-[11px] text-[#64746B] space-y-1">
                      <div>
                        Source Document:{' '}
                        <span className="font-mono-num font-medium text-[#17231E]">
                          {selectedEdge.sourceDocumentId}
                          {selectedEdge.sourcePage ? ` (p.${selectedEdge.sourcePage})` : ''}
                        </span>
                      </div>
                      {selectedEdge.extractedRecordId && (
                        <div>
                          Extracted Record:{' '}
                          <span className="font-mono-num font-medium text-[#17231E]">
                            {selectedEdge.extractedRecordId}
                          </span>
                        </div>
                      )}
                      <div>
                        Matching Method:{' '}
                        <span className="font-mono-num text-[#17231E]">
                          {selectedEdge.matchingMethod}
                        </span>
                      </div>
                      <div className="pt-1 text-[#17231E] leading-relaxed">
                        {selectedEdge.matchRationale}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDocumentInVerification(selectedEdge.sourceDocumentId)}
                    className="w-full py-2 px-3 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Open Source Document ({selectedEdge.sourceDocumentId})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
