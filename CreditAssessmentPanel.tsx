import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Info } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatINR } from '../../utils/financialEngines';

export function CreditAssessmentPanel() {
  const { creditAssessment, setActivePage } = useWorkspace();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);

  const score = creditAssessment.overallScore ?? 0;
  // Semicircle SVG arc geometry (radius 54, circumference of half-circle = PI * 54 ≈ 169.65)
  const radius = 54;
  const halfCircumference = Math.PI * radius;
  const dashOffset = halfCircumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  const scoreColor =
    score >= 75 ? '#176B45' : score >= 55 ? '#D99124' : '#DC4545';

  return (
    <section className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#DCE7DF] flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-semibold text-[14px] text-[#17231E] leading-tight">
            Financial Credit Assessment
          </h2>
          <div className="text-[11px] text-[#64746B] mt-0.5 flex items-center gap-1.5">
            <span>EvidenceOS Indicative Financial Readiness Score</span>
            {creditAssessment.isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#D99124]">DEMO</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActivePage('credit-assessment')}
          className="text-xs font-medium text-[#176B45] hover:text-[#104B32] inline-flex items-center gap-1 shrink-0"
          title="Open full Credit Assessment model"
        >
          <span>Full model</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {!creditAssessment.dataSufficient ? (
        <div className="p-4 text-xs text-[#64746B] space-y-2">
          <div className="font-semibold text-[#17231E]">
            Insufficient verified financial data to calculate a reliable assessment.
          </div>
          <p>
            Not enough information to estimate loan capacity. Upload verified bank statements,
            operating financial statements, and existing obligation schedules.
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3.5">
          {/* Semicircular Score Gauge + Indicative Loan Capacity */}
          <div className="flex items-center gap-4">
            <div className="relative w-[132px] h-[78px] shrink-0 flex items-end justify-center">
              <svg viewBox="0 0 132 76" className="w-full h-full overflow-visible">
                <path
                  d="M 12 68 A 54 54 0 0 1 120 68"
                  fill="none"
                  stroke="#E6EFE9"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 12 68 A 54 54 0 0 1 120 68"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={halfCircumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-500 ease-out"
                />
              </svg>
              <div className="absolute bottom-0 text-center">
                <div className="font-mono-num font-bold text-2xl text-[#17231E] leading-none">
                  {creditAssessment.overallScore}
                  <span className="text-xs font-medium text-[#64746B]"> / 100</span>
                </div>
                <div className="text-[10px] font-medium text-[#176B45] mt-1 whitespace-nowrap">
                  {creditAssessment.readinessBand}
                </div>
              </div>
            </div>

            {/* Prominent Indicative Loan Capacity */}
            <div className="flex-1 min-w-0 border-l border-[#DCE7DF] pl-4">
              <div className="text-[11px] font-medium text-[#64746B]">
                Indicative Loan Capacity
              </div>
              <div className="font-mono-num font-bold text-[22px] text-[#104B32] leading-tight mt-0.5">
                {creditAssessment.indicativeLoanAmount !== null
                  ? formatINR(creditAssessment.indicativeLoanAmount)
                  : 'Not enough data'}
              </div>
              <div className="text-[11px] text-[#64746B] mt-1">
                Est. EMI:{' '}
                <span className="font-mono-num font-semibold text-[#17231E]">
                  {formatINR(creditAssessment.estimatedMonthlyEmi)}/mo
                </span>
              </div>
              <div className="text-[11px] text-[#64746B]">
                Data completeness:{' '}
                <span className="font-mono-num font-semibold text-[#17231E]">
                  {creditAssessment.dataCompletenessPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Key Capacity Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#DCE7DF] text-[11px]">
            <div>
              <div className="text-[#64746B]">Free Cash Flow</div>
              <div className="font-mono-num font-semibold text-[#17231E] mt-0.5">
                {formatINR(creditAssessment.monthlyFreeCashFlow)}/mo
              </div>
            </div>
            <div>
              <div className="text-[#64746B]">Existing EMIs</div>
              <div className="font-mono-num font-semibold text-[#17231E] mt-0.5">
                {formatINR(creditAssessment.existingObligations)}/mo
              </div>
            </div>
            <div>
              <div className="text-[#64746B]">Repay Capacity</div>
              <div className="font-mono-num font-semibold text-[#176B45] mt-0.5">
                {formatINR(creditAssessment.availableRepaymentCapacity)}/mo
              </div>
            </div>
          </div>

          {/* Expandable Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs border-t border-[#DCE7DF]">
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="py-1 font-medium text-[#17231E] hover:text-[#176B45] inline-flex items-center gap-1"
            >
              <span>Score Breakdown (6 factors)</span>
              {showBreakdown ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowCalculation((v) => !v)}
              className="py-1 font-medium text-[#176B45] hover:text-[#104B32] inline-flex items-center gap-1"
            >
              <span>View Calculation</span>
              {showCalculation ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Expandable 6-Factor Breakdown */}
          {showBreakdown && (
            <div className="space-y-2 pt-1 text-xs">
              {creditAssessment.factors.map((f) => (
                <div key={f.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium text-[#17231E]">{f.label}</span>
                    <span className="font-mono-num text-[#64746B]">
                      {f.rawScore}/100 ({Math.round(f.weight * 100)}% wt → +{f.weightedContribution})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EDF3EF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#176B45] rounded-full"
                      style={{ width: `${f.rawScore}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="text-[11px] text-[#64746B] pt-1">
                Model: <span className="font-mono-num">{creditAssessment.modelVersion}</span>
              </div>
            </div>
          )}

          {/* Expandable Debt-Service Affordability Calculation */}
          {showCalculation && (
            <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF] text-[11px] space-y-1.5 text-[#17231E]">
              <div className="font-semibold text-[#104B32]">
                Transparent Debt-Service Affordability Proof
              </div>
              <div className="flex justify-between">
                <span className="text-[#64746B]">Verified Monthly Revenue</span>
                <span className="font-mono-num">{formatINR(creditAssessment.verifiedMonthlyRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64746B]">Less: Operating Expenses</span>
                <span className="font-mono-num">-{formatINR(creditAssessment.verifiedOperatingExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64746B]">Less: Existing Loan Obligations</span>
                <span className="font-mono-num">-{formatINR(creditAssessment.existingObligations)}</span>
              </div>
              <div className="flex justify-between border-t border-[#DCE7DF] pt-1 font-medium">
                <span>Net Surplus × {Math.round(creditAssessment.assumptions.affordabilityRatio * 100)}% Affordability Ratio</span>
                <span className="font-mono-num text-[#176B45]">
                  {formatINR(creditAssessment.availableRepaymentCapacity)}/mo
                </span>
              </div>
              <div className="text-[#64746B] pt-1">
                Amortized at{' '}
                <span className="font-mono-num font-medium text-[#17231E]">
                  {creditAssessment.assumptions.interestRateAnnualPct}% p.a.
                </span>{' '}
                over{' '}
                <span className="font-mono-num font-medium text-[#17231E]">
                  {creditAssessment.assumptions.repaymentTermMonths} months
                </span>{' '}
                → Indicative Capacity{' '}
                <span className="font-mono-num font-semibold text-[#104B32]">
                  {formatINR(creditAssessment.indicativeLoanAmount)}
                </span>
                .
              </div>
            </div>
          )}

          {/* Mandatory Non-Bureau Indicative Disclaimer */}
          <div className="flex items-start gap-2 pt-2 border-t border-[#DCE7DF] text-[10.5px] text-[#64746B] leading-relaxed">
            <Info className="w-3.5 h-3.5 text-[#64746B] shrink-0 mt-0.5" />
            <span>
              EvidenceOS provides an indicative financial readiness and affordability assessment. It
              does not provide an official credit bureau score, credit sanction or guaranteed
              lending decision.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
