import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  FileSearch,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { DocumentAuthenticityReport, ExtractedRecord } from '../types/evidenceos';

export function VerificationPage() {
  const {
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    applyManualCorrection,
    updateDocumentAuthenticityReport,
  } = useWorkspace();

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocumentId) || documents[0],
    [documents, selectedDocumentId]
  );

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<ExtractedRecord | null>(null);
  const [correctedInput, setCorrectedInput] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [rechecking, setRechecking] = useState(false);
  const [recheckMessage, setRecheckMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeRecord = useMemo(() => {
    if (!activeDoc) return null;
    return (
      activeDoc.records.find((r) => r.recordId === selectedRecordId) ||
      activeDoc.records[0] ||
      null
    );
  }, [activeDoc, selectedRecordId]);

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc || !editingRecord || !correctedInput.trim()) return;
    await applyManualCorrection(
      activeDoc.id,
      editingRecord.recordId,
      editingRecord.fieldLabel,
      editingRecord.normalizedValue ?? 'null',
      correctedInput.trim(),
      correctionReason.trim() || 'Analyst verification against original source scan'
    );
    setEditingRecord(null);
    setCorrectedInput('');
    setCorrectionReason('');
  };

  const handleRecheckWithGemini = async () => {
    if (!activeDoc) return;
    setRechecking(true);
    setRecheckMessage(null);
    try {
      const res = await fetch('/api/v1/ocr/recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: activeDoc.id,
          fileName: activeDoc.fileName,
          category: activeDoc.category,
          isDemo: activeDoc.isDemo,
          textContent: activeDoc.previewText || activeDoc.extractedSummary,
          imageDataUrl: activeDoc.previewDataUrl?.startsWith('data:image/')
            ? activeDoc.previewDataUrl
            : undefined,
          existingRecords: activeDoc.records.map((r) => ({
            recordId: r.recordId,
            fieldLabel: r.fieldLabel,
            normalizedValue: r.normalizedValue,
            correctedValue: r.correctedValue,
            evidenceText: r.evidenceText,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.report) {
        throw new Error(data.error || 'Gemini recheck request failed');
      }
      const report: DocumentAuthenticityReport = data.report;
      await updateDocumentAuthenticityReport(activeDoc.id, report);
      setRecheckMessage({
        type: 'success',
        text: `Live Gemini recheck complete (${report.modelUsed}): ${report.originClassification} · ${report.geminiMatchPercentage}% field match (${report.matchedFieldsCount}/${report.totalFieldsChecked} fields).`,
      });
    } catch (err) {
      setRecheckMessage({
        type: 'error',
        text: `Gemini recheck error: ${err instanceof Error ? err.message : 'Unable to reach Gemini endpoint'}`,
      });
    } finally {
      setRechecking(false);
    }
  };

  if (!activeDoc) {
    return (
      <div className="p-6 text-sm text-[#64746B]">
        No documents available. Upload financial evidence first.
      </div>
    );
  }

  const authenticityReport = activeDoc.authenticityReport;
  const formattedCheckedAt = authenticityReport?.lastCheckedAt
    ? new Date(authenticityReport.lastCheckedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="p-5 max-w-[1440px] mx-auto space-y-4">
      {/* Header & Document Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">Document Verification</h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            Extract, inspect, check AI/synthetic origin, and validate field matching with Gemini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Select document to inspect"
            value={activeDoc.id}
            onChange={(e) => {
              setSelectedDocumentId(e.target.value);
              setSelectedRecordId(null);
              setEditingRecord(null);
              setRecheckMessage(null);
            }}
            className="h-9 px-3 text-xs font-medium bg-white border border-[#DCE7DF] rounded-lg text-[#17231E]"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} — {d.fileName} ({d.verificationStatus})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRecheckWithGemini}
            disabled={rechecking}
            className="h-9 px-3.5 rounded-lg bg-[#176B45] hover:bg-[#104B32] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? 'animate-spin' : ''}`} />
            <span>{rechecking ? 'Rechecking with Gemini...' : 'Recheck with Gemini'}</span>
          </button>
        </div>
      </div>

      {/* Verification Pipeline Strip */}
      <div className="bg-white border border-[#DCE7DF] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-[#64746B]">
          <span className="font-semibold text-[#17231E]">Workflow:</span>
          <span>1. Classification ({activeDoc.subcategory})</span>
          <span>→</span>
          <span>2. OCR ({activeDoc.ocrStatus})</span>
          <span>→</span>
          <span>3. AI / Synthetic & Gemini Match Recheck</span>
          <span>→</span>
          <span>4. Completeness & Consistency</span>
        </div>
        <div className="font-mono-num text-[11px] text-[#64746B]">
          SHA-256: {activeDoc.sha256Short} · Pages: {activeDoc.pageCount}
        </div>
      </div>

      {recheckMessage && (
        <div
          className={`p-3 rounded-lg text-xs border ${
            recheckMessage.type === 'error'
              ? 'bg-[#FEF2F2] border-[#DC4545]/30 text-[#DC4545]'
              : 'bg-[#F0F5F1] border-[#176B45]/30 text-[#104B32]'
          }`}
        >
          {recheckMessage.text}
        </div>
      )}

      {/* Document Authenticity & Gemini Recheck Report (Visible for Every Document) */}
      <section className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#DCE7DF] bg-[#F7FAF8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-[#17231E] flex items-center gap-2">
              {authenticityReport?.isAiGeneratedOrSynthetic ? (
                <ShieldAlert className="w-4 h-4 text-[#D99124] shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#176B45] shrink-0" />
              )}
              <span>Document Authenticity & Gemini Recheck Report ({activeDoc.id})</span>
            </h3>
            <div className="text-[11px] text-[#64746B] mt-0.5 font-mono-num">
              {authenticityReport ? (
                <>
                  <span>
                    {authenticityReport.recheckSource === 'live_gemini_recheck'
                      ? 'Live Gemini Recheck'
                      : 'Baseline Demo Check'}
                  </span>
                  <span> · Model: {authenticityReport.modelUsed}</span>
                  {formattedCheckedAt && <span> · Checked: {formattedCheckedAt}</span>}
                </>
              ) : (
                <span>Not yet rechecked with Gemini · Click button to inspect</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecheckWithGemini}
            disabled={rechecking}
            className="h-8 px-3 rounded-lg border border-[#176B45] bg-white hover:bg-[#F0F5F1] disabled:opacity-60 text-[#176B45] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Sparkles className={`w-3.5 h-3.5 ${rechecking ? 'animate-pulse' : ''}`} />
            <span>
              {rechecking
                ? 'Running Live Gemini Recheck...'
                : authenticityReport?.recheckSource === 'live_gemini_recheck'
                  ? 'Run Fresh Gemini Recheck'
                  : 'Run Live Gemini Recheck'}
            </span>
          </button>
        </div>

        {!authenticityReport ? (
          <div className="p-5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#64746B]">
            <p className="max-w-2xl">
              No AI/synthetic origin report or Gemini field-match score has been generated for{' '}
              <span className="font-semibold text-[#17231E]">{activeDoc.fileName}</span> yet. Run a
              live Gemini recheck to evaluate synthetic indicators and calculate the exact field
              match percentage.
            </p>
            <button
              type="button"
              onClick={handleRecheckWithGemini}
              disabled={rechecking}
              className="px-3.5 py-2 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white text-xs font-semibold"
            >
              {rechecking ? 'Rechecking...' : 'Run Gemini Recheck Now'}
            </button>
          </div>
        ) : (
          <div>
            {/* Two-Column Core Verdict: AI/Synthetic Status + Gemini Match % */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#DCE7DF]">
              {/* Left: Is this AI-Generated or Synthetic? */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-[#64746B]">
                      Is this AI-Generated or Synthetic?
                    </div>
                    <div
                      className={`mt-1 text-base font-display font-bold ${
                        authenticityReport.originClassification ===
                        'AI-Generated / Synthetic Indicators Detected'
                          ? 'text-[#DC4545]'
                          : authenticityReport.isAiGeneratedOrSynthetic ||
                              authenticityReport.originClassification ===
                                'Inconclusive — Manual Review Needed'
                            ? 'text-[#D99124]'
                            : 'text-[#248451]'
                      }`}
                    >
                      {authenticityReport.isAiGeneratedOrSynthetic
                        ? `Yes — ${authenticityReport.originClassification}`
                        : authenticityReport.originClassification ===
                            'Likely Authentic / Human-Authored'
                          ? `No — ${authenticityReport.originClassification}`
                          : authenticityReport.originClassification}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-[#64746B]">Synthetic Likelihood</div>
                    <div className="font-mono-num text-lg font-bold text-[#17231E]">
                      {authenticityReport.syntheticLikelihoodPct}%
                    </div>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-[#F0F5F1] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      authenticityReport.syntheticLikelihoodPct >= 70
                        ? 'bg-[#D99124]'
                        : authenticityReport.syntheticLikelihoodPct >= 40
                          ? 'bg-[#D99124]/70'
                          : 'bg-[#248451]'
                    }`}
                    style={{ width: `${authenticityReport.syntheticLikelihoodPct}%` }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-[#17231E]">Forensic Signals</div>
                  <ul className="space-y-1 text-xs text-[#64746B]">
                    {authenticityReport.forensicSignals.map((signal, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#176B45] font-semibold shrink-0">·</span>
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right: Gemini Recheck Match Percentage */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-[#64746B]">
                      Matching Percentage by Rechecking with Gemini
                    </div>
                    <div className="mt-1 flex items-baseline gap-2.5">
                      <span
                        className={`font-mono-num text-2xl font-bold ${
                          authenticityReport.geminiMatchPercentage >= 90
                            ? 'text-[#248451]'
                            : authenticityReport.geminiMatchPercentage >= 70
                              ? 'text-[#D99124]'
                              : 'text-[#DC4545]'
                        }`}
                      >
                        {authenticityReport.geminiMatchPercentage}%
                      </span>
                      <span className="text-xs text-[#64746B] font-mono-num">
                        {authenticityReport.matchedFieldsCount} /{' '}
                        {authenticityReport.totalFieldsChecked} fields matched
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-[#64746B]">Check Mode</div>
                    <div className="text-xs font-semibold text-[#104B32] mt-0.5">
                      {authenticityReport.recheckSource === 'live_gemini_recheck'
                        ? 'Live Gemini Pass'
                        : 'Baseline Demo Pass'}
                    </div>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-[#F0F5F1] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      authenticityReport.geminiMatchPercentage >= 90
                        ? 'bg-[#248451]'
                        : authenticityReport.geminiMatchPercentage >= 70
                          ? 'bg-[#D99124]'
                          : 'bg-[#DC4545]'
                    }`}
                    style={{ width: `${authenticityReport.geminiMatchPercentage}%` }}
                  />
                </div>

                <p className="text-xs text-[#17231E] leading-relaxed">
                  {authenticityReport.summaryNote}
                </p>
              </div>
            </div>

            {/* Field-by-Field Gemini Recheck Comparison Table */}
            {authenticityReport.fieldComparisons.length > 0 && (
              <div className="border-t border-[#DCE7DF]">
                <div className="px-4 py-2 bg-[#FAFDFB] border-b border-[#DCE7DF] flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#17231E]">
                    Field-by-Field Gemini Recheck Comparison
                  </span>
                  <span className="text-[#64746B]">
                    Click a row to highlight its source text below
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white border-b border-[#DCE7DF] text-[11px] text-[#64746B]">
                        <th className="py-2 px-4 font-semibold">Record</th>
                        <th className="py-2 px-3 font-semibold">Field</th>
                        <th className="py-2 px-3 font-semibold">Stored / Corrected Value</th>
                        <th className="py-2 px-3 font-semibold">Gemini Rechecked Value</th>
                        <th className="py-2 px-3 font-semibold text-right">Match %</th>
                        <th className="py-2 px-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE7DF]">
                      {authenticityReport.fieldComparisons.map((fc) => (
                        <tr
                          key={fc.recordId}
                          onClick={() => setSelectedRecordId(fc.recordId)}
                          className={`cursor-pointer transition-colors ${
                            activeRecord?.recordId === fc.recordId
                              ? 'bg-[#F0F5F1]'
                              : 'hover:bg-[#F7FAF8]'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono-num font-semibold text-[#176B45]">
                            {fc.recordId}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-[#17231E]">{fc.fieldLabel}</div>
                            <div className="text-[11px] text-[#64746B]">{fc.note}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono-num text-[#17231E]">
                            {fc.recordedValue ?? 'null (unreadable)'}
                          </td>
                          <td className="py-2.5 px-3 font-mono-num text-[#104B32] font-medium">
                            {fc.geminiRecheckedValue ?? 'null (unreadable)'}
                          </td>
                          <td className="py-2.5 px-3 font-mono-num font-semibold text-right text-[#17231E]">
                            {fc.matchScorePct}%
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold capitalize">
                            <span
                              className={
                                fc.status === 'matched'
                                  ? 'text-[#248451]'
                                  : fc.status === 'mismatch'
                                    ? 'text-[#DC4545]'
                                    : 'text-[#D99124]'
                              }
                            >
                              {fc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Forensic Accountability Disclaimer */}
            <div className="px-4 py-2 bg-[#FAFDFB] border-t border-[#DCE7DF] text-[11px] text-[#64746B]">
              Forensic indicator only — Gemini recheck measures extraction match consistency and
              synthetic/template cues; it is not legal proof of document authenticity.
            </div>
          </div>
        )}
      </section>

      {/* Two-Panel Detailed Inspection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL (5 cols): Original Document Preview */}
        <section className="lg:col-span-5 bg-white border border-[#DCE7DF] rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#DCE7DF] bg-[#F7FAF8] flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#17231E] truncate">
                Original Document Preview
              </div>
              <div className="text-[11px] text-[#64746B] font-mono-num truncate">
                {activeDoc.fileName}
              </div>
            </div>
            <span
              className={`text-xs font-semibold shrink-0 ${
                activeDoc.verificationStatus === 'Complete'
                  ? 'text-[#248451]'
                  : activeDoc.verificationStatus === 'Inconsistent'
                    ? 'text-[#DC4545]'
                    : 'text-[#D99124]'
              }`}
            >
              {activeDoc.verificationStatus}
            </span>
          </div>

          <div className="p-4 space-y-4">
            {activeDoc.previewDataUrl && activeDoc.mimeType.startsWith('image/') ? (
              <img
                src={activeDoc.previewDataUrl}
                alt={activeDoc.fileName}
                className="w-full rounded-lg border border-[#DCE7DF] object-contain max-h-[380px] bg-[#FAFDFB]"
              />
            ) : activeDoc.previewDataUrl && activeDoc.mimeType.startsWith('video/') ? (
              <video
                src={activeDoc.previewDataUrl}
                controls
                className="w-full rounded-lg border border-[#DCE7DF] max-h-[380px] bg-black"
              />
            ) : (
              <div className="p-4 rounded-lg bg-[#FAFDFB] border border-[#DCE7DF] font-mono text-[12px] leading-relaxed text-[#17231E] whitespace-pre-wrap overflow-x-auto">
                {activeDoc.previewText}
              </div>
            )}

            {/* Highlighted Evidence Source Callout for Selected Field */}
            {activeRecord && (
              <div className="p-3 rounded-lg bg-[#F0F5F1] border border-[#DCE7DF] text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#104B32] font-semibold">
                  <span>Source Text Reference ({activeRecord.recordId})</span>
                  <span className="font-mono-num">Page {activeRecord.pageNumber}</span>
                </div>
                <div className="font-mono text-[11px] text-[#17231E] bg-white p-2 rounded border border-[#DCE7DF]">
                  {activeRecord.evidenceText}
                </div>
              </div>
            )}

            {/* Internal Consistency Notes */}
            <div className="space-y-1.5 pt-2 border-t border-[#DCE7DF]">
              <div className="text-xs font-semibold text-[#17231E]">
                Internal Consistency & Cross-Checks
              </div>
              {activeDoc.internalConsistencyNotes.map((note, idx) => (
                <div key={idx} className="text-xs text-[#64746B] flex items-start gap-2">
                  <FileSearch className="w-3.5 h-3.5 text-[#176B45] shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT PANEL (7 cols): Extracted Values, Completeness Checklist & Manual Corrections */}
        <section className="lg:col-span-7 space-y-4">
          {/* Document-Specific Completeness Checklist */}
          <div className="bg-white border border-[#DCE7DF] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm text-[#17231E]">
                Document Completeness Check ({activeDoc.subcategory})
              </h3>
              <span className="text-xs font-mono-num text-[#64746B]">
                {activeDoc.completenessChecks.filter((c) => c.present).length} /{' '}
                {activeDoc.completenessChecks.length} fields verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeDoc.completenessChecks.map((chk) => (
                <div
                  key={chk.field}
                  className="p-2.5 rounded-lg border border-[#DCE7DF] bg-[#FAFDFB] flex items-start justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[#17231E] flex items-center gap-1.5">
                      {chk.present ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#248451] shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-[#D99124] shrink-0" />
                      )}
                      <span className="truncate">{chk.field}</span>
                    </div>
                    <div className="text-[11px] text-[#64746B] mt-0.5 pl-5 truncate">
                      {chk.valuePreview || (chk.required ? 'Missing required field' : 'Optional')}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-num text-[#64746B] shrink-0">
                    {chk.required ? 'Req' : 'Opt'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Structured Extracted Records */}
          <div className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DCE7DF] flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-sm text-[#17231E]">
                  Extracted Structured Records ({activeDoc.records.length})
                </h3>
                <p className="text-[11px] text-[#64746B]">
                  Click any record to inspect its source text. Manual corrections retain the original OCR output.
                </p>
              </div>
            </div>

            {activeDoc.records.length === 0 ? (
              <div className="p-5 text-xs text-[#64746B]">
                No line-item records extracted yet. Use &ldquo;Re-verify with Gemini&rdquo; above to
                extract structured JSON fields.
              </div>
            ) : (
              <div className="divide-y divide-[#DCE7DF]">
                {activeDoc.records.map((rec) => {
                  const isSelected = activeRecord?.recordId === rec.recordId;
                  return (
                    <div
                      key={rec.recordId}
                      onClick={() => setSelectedRecordId(rec.recordId)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#F0F5F1]' : 'bg-white hover:bg-[#F7FAF8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono-num font-semibold text-[#176B45]">
                              {rec.recordId}
                            </span>
                            <span className="font-semibold text-[#17231E]">{rec.fieldLabel}</span>
                            <span className="text-[#64746B]">· p.{rec.pageNumber}</span>
                          </div>

                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <div className="text-[11px] text-[#64746B]">Original OCR</div>
                              <div className="font-mono-num font-medium text-[#17231E] mt-0.5">
                                {rec.amountOriginal || rec.normalizedValue || 'null (illegible)'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-[#64746B]">Normalized</div>
                              <div className="font-mono-num font-semibold text-[#104B32] mt-0.5">
                                {rec.correctedValue ? (
                                  <span>
                                    {rec.correctedValue}{' '}
                                    <span className="text-[10px] font-normal text-[#176B45]">
                                      (Corrected)
                                    </span>
                                  </span>
                                ) : rec.normalizedValue !== null ? (
                                  rec.normalizedValue
                                ) : (
                                  <span className="text-[#DC4545]">null — review</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-[#64746B]">Readability</div>
                              <div
                                className={`capitalize font-medium mt-0.5 ${
                                  rec.readability === 'clear'
                                    ? 'text-[#248451]'
                                    : rec.readability === 'illegible'
                                      ? 'text-[#DC4545]'
                                      : 'text-[#D99124]'
                                }`}
                              >
                                {rec.readability}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-[#64746B]">Review Flag</div>
                              <div className="font-medium mt-0.5 text-[#17231E]">
                                {rec.needsManualReview ? 'Needs Review' : 'Cleared'}
                              </div>
                            </div>
                          </div>

                          {rec.correctedValue && (
                            <div className="mt-2 text-[11px] text-[#104B32] bg-white border border-[#DCE7DF] rounded px-2.5 py-1.5">
                              Original extraction preserved ({rec.normalizedValue ?? 'null'}) ·
                              Analyst correction: <strong>{rec.correctedValue}</strong> —{' '}
                              {rec.correctionReason}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRecord(rec);
                            setCorrectedInput(rec.correctedValue || rec.normalizedValue || '');
                            setCorrectionReason(rec.correctionReason || '');
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#DCE7DF] bg-white hover:border-[#176B45] text-xs font-medium text-[#17231E] inline-flex items-center gap-1 shrink-0"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#176B45]" />
                          <span>Correct</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual Correction Editor */}
          {editingRecord && (
            <form
              onSubmit={handleSaveCorrection}
              className="bg-white border border-[#176B45] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-[#104B32]">
                  Manual Correction for {editingRecord.recordId} ({editingRecord.fieldLabel})
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="text-[#64746B] hover:text-[#17231E]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-[#64746B]">
                Original OCR value (
                <span className="font-mono-num font-semibold text-[#17231E]">
                  {editingRecord.normalizedValue ?? 'null'}
                </span>
                ) will remain permanently recorded in the audit trail.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#17231E] mb-1">
                    Verified Value
                  </label>
                  <input
                    type="text"
                    required
                    value={correctedInput}
                    onChange={(e) => setCorrectedInput(e.target.value)}
                    placeholder="e.g. 1250.00"
                    className="w-full h-9 px-3 text-xs border border-[#DCE7DF] rounded-lg focus:outline-none focus:border-[#176B45]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#17231E] mb-1">
                    Audit Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Confirmed from physical voucher"
                    className="w-full h-9 px-3 text-xs border border-[#DCE7DF] rounded-lg focus:outline-none focus:border-[#176B45]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3 py-1.5 text-xs text-[#64746B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Correction & Log Audit</span>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
