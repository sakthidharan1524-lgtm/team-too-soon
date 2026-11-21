import React from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { FinancialNetworkGraph } from '../components/graph/FinancialNetworkGraph';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatINR } from '../utils/financialEngines';

export function EvidenceGraphPage() {
  const { evidenceNodes, evidenceEdges, openDocumentInVerification, setGraphHighlight } =
    useWorkspace();

  const handleExportJson = () => {
    const payload = {
      graphType: 'evidence_knowledge_graph',
      engineArchitecture: 'networkx.MultiDiGraph',
      exportedAt: new Date().toISOString(),
      nodes: evidenceNodes,
      edges: evidenceEdges,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evidenceos_knowledge_graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4 max-w-[1440px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#17231E]">
            Evidence Knowledge Graph
          </h2>
          <p className="text-xs text-[#64746B]">
            Directed provenance multigraph linking documents, businesses, customers, claims, and contradictions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          className="h-9 px-3.5 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] text-xs font-semibold text-[#17231E] inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#176B45]" />
          <span>Export Graph JSON</span>
        </button>
      </div>

      <div className="h-[540px]">
        <FinancialNetworkGraph forcedMode="evidence" heightClass="h-full" />
      </div>

      {/* Provenance Edges Table */}
      <section className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#DCE7DF] flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-[#17231E]">
            Relationship Provenance Ledger ({evidenceEdges.length} edges)
          </h3>
          <span className="text-xs text-[#64746B]">
            Click any edge row to focus it on the canvas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7FAF8] border-b border-[#DCE7DF] text-[#64746B]">
                <th className="py-2.5 px-4 font-semibold">Edge</th>
                <th className="py-2.5 px-3 font-semibold">Relationship</th>
                <th className="py-2.5 px-3 font-semibold">Source → Target</th>
                <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                <th className="py-2.5 px-3 font-semibold">Matching Method</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Source Doc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE7DF]">
              {evidenceEdges.map((edge) => (
                <tr
                  key={edge.id}
                  onClick={() =>
                    setGraphHighlight({
                      nodeIds: [edge.source, edge.target],
                      edgeIds: [edge.id],
                      reasonLabel: `Inspecting edge ${edge.id}: ${edge.relationship}`,
                      source: 'finding',
                    })
                  }
                  className="hover:bg-[#F7FAF8] cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4 font-mono-num font-medium text-[#17231E]">
                    {edge.id}
                  </td>
                  <td className="py-2.5 px-3 font-mono-num font-semibold text-[#176B45]">
                    {edge.relationship}
                  </td>
                  <td className="py-2.5 px-3 text-[#17231E]">
                    {edge.source} → {edge.target}
                  </td>
                  <td className="py-2.5 px-3 font-mono-num text-right text-[#17231E]">
                    {edge.amount ? formatINR(edge.amount) : '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono-num text-[#64746B]">{edge.matchingMethod}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-semibold ${
                        edge.verificationStatus === 'CORROBORATED'
                          ? 'text-[#248451]'
                          : edge.verificationStatus === 'CONTRADICTED' ||
                              edge.verificationStatus === 'POSSIBLE_ANOMALY'
                            ? 'text-[#DC4545]'
                            : 'text-[#D99124]'
                      }`}
                    >
                      {edge.verificationStatus}
                    </span>
                  </td>
                  <td
                    className="py-2.5 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openDocumentInVerification(edge.sourceDocumentId)}
                      className="inline-flex items-center gap-1 font-mono-num font-semibold text-[#176B45] hover:underline"
                    >
                      {edge.sourceDocumentId}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
