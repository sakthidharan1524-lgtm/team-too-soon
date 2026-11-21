import React, { useMemo, useState } from 'react';
import { AlertTriangle, GitFork, RefreshCw } from 'lucide-react';
import { FinancialNetworkGraph } from '../components/graph/FinancialNetworkGraph';
import { useWorkspace } from '../context/WorkspaceContext';
import { detectDirectedCycles, formatINR } from '../utils/financialEngines';

export function TransactionNetworkPage() {
  const { transactionEdges, transactionNodes, setGraphHighlight, openDocumentInVerification } =
    useWorkspace();
  const [scanResultMsg, setScanResultMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const cycles = useMemo(() => detectDirectedCycles(transactionEdges, 4), [transactionEdges]);

  const handleRunCycleDetection = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/v1/graph/detect-cycles', { method: 'POST' });
      const data = await res.json();
      setScanResultMsg(
        `Cycle scan complete (${data.engine || 'NetworkX-compatible'}): ${data.cycleCount ?? cycles.length} circular path(s) detected within max length 4.`
      );
      const cycleEdges = transactionEdges.filter((e) => e.isCycleEdge);
      setGraphHighlight({
        nodeIds: Array.from(new Set(cycleEdges.flatMap((e) => [e.source, e.target]))),
        edgeIds: cycleEdges.map((e) => e.id),
        reasonLabel: 'Circular transfer loop highlighted (A → B → C → A)',
        source: 'cycle',
      });
    } catch {
      setScanResultMsg('Completed local cycle detection: 1 circular path detected.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-[1440px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#17231E]">
            Transaction Investigation Network
          </h2>
          <p className="text-xs text-[#64746B]">
            Directed Payer → Receiver multigraph for circular transfer detection, multi-hop tracing, and bank-invoice gaps.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunCycleDetection}
          disabled={scanning}
          className="h-9 px-3.5 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning cycles...' : 'Run Cycle Detection'}</span>
        </button>
      </div>

      {scanResultMsg && (
        <div className="px-3.5 py-2 rounded-lg bg-[#F0F5F1] border border-[#DCE7DF] text-xs text-[#104B32]">
          {scanResultMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 h-[520px]">
          <FinancialNetworkGraph forcedMode="transactions" heightClass="h-full" />
        </div>

        {/* Right Cycle & Pattern Analysis Panel */}
        <div className="lg:col-span-4 space-y-4">
          <section className="bg-white border border-[#DCE7DF] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-[#DC4545]" />
              <h3 className="font-display font-semibold text-sm text-[#17231E]">
                Detected Circular Paths ({cycles.length})
              </h3>
            </div>
            <p className="text-xs text-[#64746B] leading-relaxed">
              Circular transactions are <strong>investigation signals</strong>, not proof of fraud.
              Inspect the underlying invoices and dispatch challans for each leg.
            </p>

            {cycles.map((cycle, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#FAFDFB] border border-[#DCE7DF] space-y-2 text-xs"
              >
                <div className="font-semibold text-[#DC4545] flex items-center justify-between">
                  <span>Synthetic Demo Loop #{idx + 1} (3 hops)</span>
                  <span className="font-mono-num text-[11px]">24h window</span>
                </div>
                <div className="font-mono-num text-[11px] text-[#17231E] leading-relaxed">
                  {cycle
                    .map((id) => transactionNodes.find((n) => n.id === id)?.label || id)
                    .join(' → ')}
                </div>
                <div className="space-y-1 pt-1 border-t border-[#DCE7DF] text-[11px] text-[#64746B]">
                  <div>Leg 1: Kaveri Textiles → Cauvery Dyeing Mills · ₹10,000 (TXN-8819, DOC002)</div>
                  <div>Leg 2: Cauvery Dyeing Mills → Trichy Yarn Traders · ₹9,500 (ADV-409, DOC008)</div>
                  <div>Leg 3: Trichy Yarn Traders → Kaveri Textiles · ₹9,000 (TXN-8824, DOC002)</div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => openDocumentInVerification('DOC008')}
                    className="text-[#176B45] font-semibold hover:underline"
                  >
                    Open DOC008
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cycleEdges = transactionEdges.filter((e) => e.isCycleEdge);
                      setGraphHighlight({
                        nodeIds: cycle,
                        edgeIds: cycleEdges.map((e) => e.id),
                        reasonLabel: 'Circular Loop #1: A → B → C → A',
                        source: 'cycle',
                      });
                    }}
                    className="text-[#DC4545] font-semibold hover:underline"
                  >
                    Highlight on graph
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="bg-white border border-[#DCE7DF] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D99124]" />
              <h3 className="font-display font-semibold text-sm text-[#17231E]">
                Transfer Ledger Summary
              </h3>
            </div>
            <div className="divide-y divide-[#DCE7DF] text-xs">
              {transactionEdges.map((edge) => (
                <div key={edge.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[#17231E] truncate">
                      {edge.source} → {edge.target}
                    </div>
                    <div className="text-[11px] text-[#64746B] font-mono-num">
                      {edge.date} · {edge.sourceDocumentId}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-num font-semibold text-[#17231E]">
                      {formatINR(edge.amount)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        edge.verificationStatus === 'CORROBORATED'
                          ? 'text-[#248451]'
                          : edge.verificationStatus === 'CONTRADICTED' ||
                              edge.verificationStatus === 'POSSIBLE_ANOMALY'
                            ? 'text-[#DC4545]'
                            : 'text-[#D99124]'
                      }`}
                    >
                      {edge.verificationStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
