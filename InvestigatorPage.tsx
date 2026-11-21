import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Globe,
  Network,
  SearchCheck,
  Send,
  Wrench,
  Zap,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { InvestigationCardResponse } from '../types/evidenceos';

const EXAMPLE_QUESTIONS = [
  'Why is invoice INV001 flagged?',
  'Which bank entry corresponds to invoice INV001?',
  "Why is Kumar's payment unverified?",
  'Show the circular transaction path.',
  'Which financial records contradict each other?',
  'What is the evidence behind the loan estimate?',
  'What happens to loan capacity after a 20% revenue loss?',
];

export function InvestigatorPage() {
  const {
    investigations,
    addInvestigationResult,
    activeWorkspace,
    openDocumentInVerification,
    setGraphHighlight,
    setActivePage,
  } = useWorkspace();

  const [queryInput, setQueryInput] = useState('');
  const [mode, setMode] = useState<'deep_thinking' | 'fast_lite' | 'search_grounded'>('deep_thinking');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runInvestigation = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/investigations/default/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeWorkspace.id,
          query: q,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Investigation request failed (HTTP ${res.status})`);
      }

      const card: InvestigationCardResponse = data.investigation;
      await addInvestigationResult(card);
      setQueryInput('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to complete AI investigation. Verify Gemini API connectivity.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 max-w-[1380px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">AI Investigator Agent</h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            Evidence-first Gemini function-calling investigator. Retrieves source documents, graph paths, and deterministic calculations before drawing conclusions.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex items-center p-1 bg-white border border-[#DCE7DF] rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setMode('deep_thinking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mode === 'deep_thinking'
                ? 'bg-[#176B45] text-white'
                : 'text-[#64746B] hover:text-[#17231E]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Deep Thinking (Tool Calling)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('fast_lite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mode === 'fast_lite'
                ? 'bg-[#176B45] text-white'
                : 'text-[#64746B] hover:text-[#17231E]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Low-Latency (Flash-Lite)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('search_grounded')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mode === 'search_grounded'
                ? 'bg-[#176B45] text-white'
                : 'text-[#64746B] hover:text-[#17231E]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Google Search Grounded</span>
          </button>
        </div>
      </div>

      {/* Query Composer + Suggested Investigative Prompts */}
      <section className="bg-white border border-[#DCE7DF] rounded-xl p-4 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runInvestigation(queryInput);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <SearchCheck className="w-4 h-4 text-[#176B45] absolute left-3.5 top-3" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask an investigative question (e.g., Why is invoice INV001 flagged? or Check RBI MSME lending norms)..."
              className="w-full h-10 pl-10 pr-4 text-sm bg-[#F7FAF8] border border-[#DCE7DF] rounded-lg text-[#17231E] placeholder:text-[#64746B] focus:outline-none focus:border-[#176B45] focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !queryInput.trim()}
            className="h-10 px-5 rounded-lg bg-[#176B45] hover:bg-[#104B32] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Investigating Evidence...' : 'Run Investigation'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-[#64746B] mr-1">Example queries:</span>
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => {
                setQueryInput(q);
                runInvestigation(q);
              }}
              className="px-2.5 py-1 rounded-md border border-[#DCE7DF] bg-[#F7FAF8] hover:border-[#176B45] hover:bg-[#F0F5F1] text-[11px] text-[#17231E] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#DC4545]/30 text-xs text-[#DC4545] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Structured Investigation Cards */}
      {investigations.length === 0 ? (
        <div className="bg-white border border-[#DCE7DF] rounded-xl p-10 text-center space-y-2">
          <SearchCheck className="w-8 h-8 text-[#176B45] mx-auto" />
          <div className="font-display font-semibold text-sm text-[#17231E]">
            No investigations executed yet
          </div>
          <p className="text-xs text-[#64746B] max-w-md mx-auto leading-relaxed">
            Select one of the example queries above or type your own question. The AI Investigator
            will invoke structured tools against Kaveri Textiles records and return an auditable
            evidence card.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {investigations.map((card) => (
            <article
              key={card.id}
              className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden"
            >
              {/* Card Header */}
              <div className="px-5 py-3.5 border-b border-[#DCE7DF] bg-[#F7FAF8] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] text-[#64746B] font-mono-num flex items-center gap-2">
                    <span>{card.id}</span>
                    <span>·</span>
                    <span>{card.modelUsed}</span>
                    {card.thinkingMode && (
                      <>
                        <span>·</span>
                        <span className="text-[#176B45] font-semibold">High Thinking</span>
                      </>
                    )}
                    {card.searchGrounded && (
                      <>
                        <span>·</span>
                        <span className="text-[#176B45] font-semibold">Google Search Grounded</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display font-semibold text-[15px] text-[#17231E] mt-0.5">
                    {card.query}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`font-semibold uppercase tracking-wide text-[11px] ${
                      card.riskLevel === 'high'
                        ? 'text-[#DC4545]'
                        : card.riskLevel === 'elevated'
                          ? 'text-[#D99124]'
                          : 'text-[#248451]'
                    }`}
                  >
                    Signal Level: {card.riskLevel}
                  </span>
                  {card.highlightedNodeIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setGraphHighlight({
                          nodeIds: card.highlightedNodeIds,
                          edgeIds: [],
                          reasonLabel: `Investigator focus: ${card.query}`,
                          source: 'investigator',
                        });
                        setActivePage('overview');
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[#DCE7DF] bg-white hover:border-[#176B45] text-[#176B45] font-semibold inline-flex items-center gap-1"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Highlight on Graph</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                <p className="text-sm text-[#17231E] leading-relaxed whitespace-pre-line">
                  {card.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Verified Facts */}
                  <div className="p-3.5 rounded-lg bg-[#FAFDFB] border border-[#DCE7DF] space-y-2">
                    <div className="text-xs font-semibold text-[#104B32] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#248451]" />
                      <span>Verified Evidence Facts</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#17231E]">
                      {card.verifiedFacts.map((fact, idx) => (
                        <li key={idx} className="leading-relaxed">
                          • {fact}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Missing Info & Assumptions */}
                  <div className="p-3.5 rounded-lg bg-[#FAFDFB] border border-[#DCE7DF] space-y-2">
                    <div className="text-xs font-semibold text-[#17231E] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-[#D99124]" />
                      <span>Evidence Gaps & Explicit Assumptions</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#64746B]">
                      {card.assumptionsAndGaps.map((gap, idx) => (
                        <li key={idx} className="leading-relaxed">
                          • {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tool Execution Trace */}
                {card.toolTraces.length > 0 && (
                  <div className="pt-3 border-t border-[#DCE7DF] space-y-2">
                    <div className="text-xs font-semibold text-[#17231E] flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-[#176B45]" />
                      <span>Evidence Tools Invoked ({card.toolTraces.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {card.toolTraces.map((trace, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF] text-[11px]"
                        >
                          <div className="font-mono-num font-semibold text-[#104B32]">
                            {trace.toolName}({JSON.stringify(trace.arguments)})
                          </div>
                          <div className="text-[#64746B] mt-0.5">{trace.resultSummary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounding Web Sources (when Search Grounding enabled) */}
                {card.groundingSources && card.groundingSources.length > 0 && (
                  <div className="pt-3 border-t border-[#DCE7DF] space-y-1.5">
                    <div className="text-xs font-semibold text-[#17231E] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#176B45]" />
                      <span>Google Search Grounding Citations</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {card.groundingSources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#176B45] hover:underline bg-[#F0F5F1] px-2.5 py-1 rounded-md border border-[#DCE7DF]"
                        >
                          <span>{src.title}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cited Source Documents */}
                {card.citedDocumentIds.length > 0 && (
                  <div className="pt-3 border-t border-[#DCE7DF] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#64746B] font-medium">Cited Documents:</span>
                      {card.citedDocumentIds.map((docId) => (
                        <button
                          key={docId}
                          type="button"
                          onClick={() => openDocumentInVerification(docId)}
                          className="font-mono-num font-semibold text-[#176B45] hover:underline inline-flex items-center gap-0.5"
                        >
                          {docId}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#64746B]">
                      EvidenceOS AI Investigator never makes lending decisions or declares fraud without authoritative proof.
                    </span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
