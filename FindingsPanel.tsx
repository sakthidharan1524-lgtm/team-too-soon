import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Info, ShieldAlert } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatINR } from '../../utils/financialEngines';
import { FindingStatus } from '../../types/evidenceos';

export function FindingsPanel() {
  const {
    findings,
    selectedFindingId,
    selectFindingAndHighlight,
    openDocumentInVerification,
    updateFindingReview,
  } = useWorkspace();

  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'Warning'>('all');

  const visibleFindings = findings.filter((f) => {
    if (severityFilter === 'all') return true;
    return f.severity === severityFilter;
  });

  const criticalCount = findings.filter(
    (f) => f.severity === 'Critical' && f.status !== 'Resolved'
  ).length;

  return (
    <section className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden flex flex-col">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-[#DCE7DF] flex items-center justify-between gap-2 bg-white">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-[14px] text-[#17231E] leading-tight">
            Findings & Evidence Alerts
          </h2>
          <p className="text-[11px] text-[#64746B] mt-0.5">
            {criticalCount} critical · {findings.length} total signals
          </p>
        </div>

        <div className="inline-flex items-center p-0.5 bg-[#F0F5F1] border border-[#DCE7DF] rounded-lg shrink-0">
          {(['all', 'Critical', 'Warning'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSeverityFilter(tab)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                severityFilter === tab
                  ? 'bg-white text-[#104B32] font-semibold'
                  : 'text-[#64746B] hover:text-[#17231E]'
              }`}
            >
              {tab === 'all' ? 'All' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="divide-y divide-[#DCE7DF] max-h-[340px] overflow-y-auto">
        {visibleFindings.map((finding) => {
          const isSelected = selectedFindingId === finding.id;
          const isResolved = finding.status === 'Resolved';

          return (
            <div
              key={finding.id}
              onClick={() => selectFindingAndHighlight(finding)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectFindingAndHighlight(finding);
                }
              }}
              className={`p-3.5 text-left transition-colors cursor-pointer ${
                isSelected ? 'bg-[#F0F5F1]' : 'bg-white hover:bg-[#F7FAF8]'
              }`}
            >
              {/* Title + Severity Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {isResolved ? (
                    <CheckCircle2 className="w-4 h-4 text-[#248451] shrink-0 mt-0.5" />
                  ) : finding.severity === 'Critical' ? (
                    <ShieldAlert className="w-4 h-4 text-[#DC4545] shrink-0 mt-0.5" />
                  ) : finding.severity === 'Warning' ? (
                    <AlertCircle className="w-4 h-4 text-[#D99124] shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#17231E] leading-snug">
                      {finding.title}
                    </div>
                    <div className="text-[11px] text-[#64746B] mt-0.5 flex flex-wrap items-center gap-x-1.5">
                      <span>{finding.affectedEntity}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          isResolved
                            ? 'text-[#248451]'
                            : finding.severity === 'Critical'
                              ? 'text-[#DC4545]'
                              : finding.severity === 'Warning'
                                ? 'text-[#D99124]'
                                : 'text-[#176B45]'
                        }`}
                      >
                        {finding.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explicit Numeric Comparison when available (e.g., Invoice ₹25,000 vs Bank ₹20,000) */}
              {finding.comparison && (
                <div className="mt-2.5 grid grid-cols-3 gap-2 px-2.5 py-2 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF] text-[11px]">
                  <div>
                    <div className="text-[#64746B] truncate">{finding.comparison.labelA}</div>
                    <div className="font-mono-num font-semibold text-[#17231E] mt-0.5">
                      {formatINR(finding.comparison.valueA)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#64746B] truncate">{finding.comparison.labelB}</div>
                    <div className="font-mono-num font-semibold text-[#17231E] mt-0.5">
                      {formatINR(finding.comparison.valueB)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#64746B]">Difference</div>
                    <div className="font-mono-num font-semibold text-[#DC4545] mt-0.5">
                      {formatINR(finding.comparison.difference)}
                    </div>
                  </div>
                </div>
              )}

              {/* Reason for detection */}
              <p className="mt-2 text-xs text-[#64746B] leading-relaxed">{finding.reason}</p>

              {/* Footer Actions */}
              <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
                <div className="text-[#64746B] font-mono-num truncate">
                  Sources: {finding.sourceDocumentIds.join(', ')}
                </div>

                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() =>
                        updateFindingReview(
                          finding.id,
                          'Resolved' as FindingStatus,
                          'Reviewed and acknowledged in EvidenceOS workstation.'
                        )
                      }
                      className="text-[#64746B] hover:text-[#248451] font-medium transition-colors"
                    >
                      Mark resolved
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      openDocumentInVerification(finding.sourceDocumentIds[0] || 'DOC001')
                    }
                    className="inline-flex items-center gap-1 font-semibold text-[#176B45] hover:text-[#104B32] transition-colors"
                  >
                    <span>View Evidence</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
