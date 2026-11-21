import React, { useState } from 'react';
import { Download, FileSpreadsheet, Printer, Search } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatINR } from '../utils/financialEngines';

export function ReportsPage() {
  const {
    activeWorkspace,
    documents,
    findings,
    creditAssessment,
    activeSimulation,
    investigations,
    logAuditEvent,
  } = useWorkspace();

  const [reportSearch, setReportSearch] = useState('');
  const [analystNotes, setAnalystNotes] = useState(
    'Preliminary MSME financial evidence dossier for Kaveri Textiles (synthetic demo). Two open critical signals require resolution before final underwriting review: INV001 ₹5,000 bank variance and 3-hop circular transfer loop A→B→C→A.'
  );

  const reportId = `RPT-${activeWorkspace.id.toUpperCase()}-202611`;

  const buildReportPayload = () => ({
    reportId,
    generatedAt: new Date().toISOString(),
    disclaimer:
      'Internal analytical summary produced by EvidenceOS. Not a certified audit, bureau score, or legal verification.',
    isDemo: activeWorkspace.isDemo,
    businessEntity: activeWorkspace,
    documentsExamined: documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      category: d.subcategory,
      verificationStatus: d.verificationStatus,
      recordsCount: d.records.length,
    })),
    findings,
    graphObservations: [
      'Evidence graph links 12 entities across 13 provenance edges.',
      'INV001 billed ₹25,000 contradicts SBI bank credit TXN-8841 (₹20,000).',
      'Transaction graph detects 1 directed 3-hop cycle: Business A → B (₹10,000) → C (₹9,500) → A (₹9,000).',
    ],
    creditAssessment,
    simulationSnapshot: activeSimulation,
    investigationsCount: investigations.length,
    investigationNotes: analystNotes,
  });

  const handleExportJson = async () => {
    const payload = buildReportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await logAuditEvent('user_modification', 'REPORT_EXPORT_JSON', reportId, 'EXPORTED', 'Exported investigation dossier JSON.');
  };

  const handleExportCsv = async () => {
    const headers = ['FindingID', 'Title', 'Severity', 'Status', 'AffectedEntity', 'AmountINR', 'Sources'];
    const rows = findings.map((f) => [
      f.id,
      `"${f.title.replace(/"/g, '""')}"`,
      f.severity,
      f.status,
      `"${f.affectedEntity.replace(/"/g, '""')}"`,
      f.affectedAmount ?? '',
      `"${f.sourceDocumentIds.join('; ')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}_findings.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await logAuditEvent('user_modification', 'REPORT_EXPORT_CSV', reportId, 'EXPORTED', 'Exported findings register CSV.');
  };

  const handlePrint = async () => {
    await logAuditEvent('user_modification', 'REPORT_PRINT', reportId, 'PRINTED', 'Triggered formatted print dossier.');
    window.print();
  };

  const filteredFindings = findings.filter(
    (f) =>
      !reportSearch.trim() ||
      f.title.toLowerCase().includes(reportSearch.toLowerCase()) ||
      f.reason.toLowerCase().includes(reportSearch.toLowerCase())
  );

  return (
    <div className="p-5 max-w-[1280px] mx-auto space-y-5">
      {/* Top Toolbar */}
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">Investigation Reports</h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            Structured 12-section evidence intelligence dossier ready for JSON/CSV export or formatted print.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64746B] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              placeholder="Filter report findings..."
              className="h-9 pl-8 pr-3 text-xs bg-white border border-[#DCE7DF] rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={handleExportJson}
            className="h-9 px-3.5 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] text-xs font-semibold text-[#17231E] inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#176B45]" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-3.5 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] text-xs font-semibold text-[#17231E] inline-flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#176B45]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="h-9 px-3.5 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Formatted Printable Dossier */}
      <article className="bg-white border border-[#DCE7DF] rounded-xl p-6 space-y-6">
        {/* 1 & 2: Investigation ID & Business Entity */}
        <div className="pb-4 border-b border-[#DCE7DF] flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono-num text-xs text-[#176B45] font-semibold">
              {reportId} · {activeWorkspace.isDemo ? 'SYNTHETIC DEMO DOSSIER' : 'LIVE DOSSIER'}
            </div>
            <h3 className="font-display text-lg font-bold text-[#17231E] mt-1">
              {activeWorkspace.name} — Financial Evidence Investigation Dossier
            </h3>
            <div className="text-xs text-[#64746B] mt-1">
              {activeWorkspace.sector} · {activeWorkspace.location} · GSTIN {activeWorkspace.gstin} · Udyam {activeWorkspace.udyamId}
            </div>
          </div>
          <div className="text-right text-xs text-[#64746B] font-mono-num">
            <div>Generated: {new Date().toISOString().slice(0, 10)}</div>
            <div>Model: {creditAssessment.modelVersion}</div>
          </div>
        </div>

        {/* 3 & 4: Documents Examined & Extracted Info */}
        <section className="space-y-2">
          <h4 className="font-display font-semibold text-sm text-[#17231E]">
            01. Documents Examined & Extracted Records ({documents.length} files)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {documents.map((d) => (
              <div key={d.id} className="p-3 rounded-lg bg-[#FAFDFB] border border-[#DCE7DF]">
                <div className="flex justify-between gap-2 font-medium text-[#17231E]">
                  <span className="truncate">
                    <span className="font-mono-num text-[#176B45]">{d.id}</span> · {d.fileName}
                  </span>
                  <span className="shrink-0 font-semibold text-[#64746B]">{d.verificationStatus}</span>
                </div>
                <p className="text-[11px] text-[#64746B] mt-1">{d.extractedSummary}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5, 6, 7, 8: Financial Findings, Graph Observations, Contradictions, Missing Evidence */}
        <section className="space-y-2">
          <h4 className="font-display font-semibold text-sm text-[#17231E]">
            02. Financial Findings, Contradictions & Graph Observations ({filteredFindings.length})
          </h4>
          <div className="divide-y divide-[#DCE7DF] border border-[#DCE7DF] rounded-lg">
            {filteredFindings.map((f) => (
              <div key={f.id} className="p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#17231E]">
                    {f.id} — {f.title}
                  </span>
                  <span className="font-semibold text-[#DC4545]">{f.status}</span>
                </div>
                <p className="text-[#64746B]">{f.reason}</p>
                <div className="font-mono-num text-[11px] text-[#64746B]">
                  Rule: {f.detectionRule} · Sources: {f.sourceDocumentIds.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 9 & 10: Credit Assessment & Simulation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="p-4 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF] text-xs space-y-1.5">
            <h4 className="font-display font-semibold text-sm text-[#17231E]">
              03. Indicative Credit Readiness Snapshot
            </h4>
            <div className="flex justify-between">
              <span className="text-[#64746B]">Readiness Score</span>
              <span className="font-mono-num font-bold text-[#104B32]">
                {creditAssessment.overallScore ?? 'N/A'} / 100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64746B]">Indicative Loan Capacity</span>
              <span className="font-mono-num font-bold text-[#17231E]">
                {formatINR(creditAssessment.indicativeLoanAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64746B]">Monthly Free Cash Flow</span>
              <span className="font-mono-num">{formatINR(creditAssessment.monthlyFreeCashFlow)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64746B]">Existing Obligations</span>
              <span className="font-mono-num">{formatINR(creditAssessment.existingObligations)}/mo</span>
            </div>
          </section>

          <section className="p-4 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF] text-xs space-y-1.5">
            <h4 className="font-display font-semibold text-sm text-[#17231E]">
              04. Latest Stress-Test Snapshot (Hypothetical)
            </h4>
            <div className="flex justify-between">
              <span className="text-[#64746B]">Scenario</span>
              <span className="font-semibold text-[#D99124]">{activeSimulation.scenarioLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64746B]">Simulated Monthly Surplus</span>
              <span className="font-mono-num font-semibold text-[#17231E]">
                {formatINR(activeSimulation.simulatedSurplus)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64746B]">Stressed Loan Capacity</span>
              <span className="font-mono-num font-semibold text-[#17231E]">
                {formatINR(activeSimulation.simulatedLoanCapacity)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64746B]">Capacity Delta</span>
              <span className="font-mono-num text-[#DC4545]">
                {formatINR(activeSimulation.loanCapacityDelta)}
              </span>
            </div>
          </section>
        </div>

        {/* 11 & 12: Investigation Notes & Non-Certification Disclaimer */}
        <section className="space-y-2">
          <h4 className="font-display font-semibold text-sm text-[#17231E]">
            05. Analyst Investigation Notes
          </h4>
          <textarea
            rows={3}
            value={analystNotes}
            onChange={(e) => setAnalystNotes(e.target.value)}
            className="w-full p-3 text-xs bg-[#FAFDFB] border border-[#DCE7DF] rounded-lg text-[#17231E] focus:outline-none focus:border-[#176B45]"
          />
          <p className="text-[11px] text-[#64746B]">
            Notice: This report is an internal financial evidence investigation summary. It is not
            certified, legally verified, an official credit bureau report, or a bank credit sanction.
          </p>
        </section>
      </article>
    </div>
  );
}
