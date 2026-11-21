import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { DEFAULT_CREDIT_WEIGHTS, formatINR } from '../utils/financialEngines';

export function CreditAssessmentPage() {
  const {
    creditAssessment,
    financialBaseline,
    setFinancialBaseline,
    creditWeights,
    setCreditWeights,
  } = useWorkspace();

  const factorChartData = creditAssessment.factors.map((f) => ({
    name: f.label.replace('Financial ', '').replace(' reliability', ''),
    Score: f.rawScore,
    Contribution: f.weightedContribution,
  }));

  return (
    <div className="p-5 max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#176B45] mb-0.5">
            DETERMINISTIC SCORING ENGINE · {creditAssessment.modelVersion}
            {creditAssessment.isDemo ? ' · DEMO' : ''}
          </div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">
            Credit Readiness & Indicative Loan Engine
          </h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            Transparent 6-factor evidence readiness score and amortization-backed loan affordability
            calculation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#DCE7DF] rounded-lg text-xs text-[#17231E] cursor-pointer">
            <input
              type="checkbox"
              checked={!financialBaseline.dataSufficient}
              onChange={(e) =>
                setFinancialBaseline((prev) => ({
                  ...prev,
                  dataSufficient: !e.target.checked,
                }))
              }
              className="accent-[#176B45]"
            />
            <span>Simulate Insufficient Evidence Guard</span>
          </label>

          <button
            type="button"
            onClick={() => setCreditWeights(DEFAULT_CREDIT_WEIGHTS)}
            className="h-9 px-3 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] text-xs font-medium text-[#17231E] inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#64746B]" />
            <span>Default Weights</span>
          </button>
        </div>
      </div>

      {!creditAssessment.dataSufficient ? (
        <div className="bg-white border border-[#D99124] rounded-xl p-8 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-[#D99124] mx-auto" />
          <div className="font-display font-bold text-base text-[#17231E]">
            Insufficient verified financial data to calculate a reliable assessment.
          </div>
          <p className="text-sm text-[#64746B] max-w-lg mx-auto">
            Not enough information to estimate loan capacity. EvidenceOS refuses to invent a score
            or loan figure when baseline verified cash-flow records are missing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Top KPI Summary Row (12 cols) */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#DCE7DF] rounded-xl p-4">
              <div className="text-xs text-[#64746B]">Indicative Readiness Score</div>
              <div className="font-mono-num text-3xl font-bold text-[#104B32] mt-1">
                {creditAssessment.overallScore}
                <span className="text-sm font-medium text-[#64746B]"> / 100</span>
              </div>
              <div className="text-xs text-[#176B45] font-medium mt-1">
                {creditAssessment.readinessBand}
              </div>
            </div>

            <div className="bg-white border border-[#DCE7DF] rounded-xl p-4">
              <div className="text-xs text-[#64746B]">Indicative Loan Capacity</div>
              <div className="font-mono-num text-3xl font-bold text-[#17231E] mt-1">
                {formatINR(creditAssessment.indicativeLoanAmount)}
              </div>
              {creditAssessment.indicativeLoanRange && (
                <div className="text-xs text-[#64746B] font-mono-num mt-1">
                  Range: {formatINR(creditAssessment.indicativeLoanRange.min)} –{' '}
                  {formatINR(creditAssessment.indicativeLoanRange.max)}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#DCE7DF] rounded-xl p-4">
              <div className="text-xs text-[#64746B]">Available Repayment Capacity</div>
              <div className="font-mono-num text-3xl font-bold text-[#176B45] mt-1">
                {formatINR(creditAssessment.availableRepaymentCapacity)}
                <span className="text-xs font-normal text-[#64746B]">/mo</span>
              </div>
              <div className="text-xs text-[#64746B] font-mono-num mt-1">
                Est. EMI: {formatINR(creditAssessment.estimatedMonthlyEmi)}/mo
              </div>
            </div>

            <div className="bg-white border border-[#DCE7DF] rounded-xl p-4">
              <div className="text-xs text-[#64746B]">Existing Obligations & Completeness</div>
              <div className="font-mono-num text-3xl font-bold text-[#17231E] mt-1">
                {formatINR(creditAssessment.existingObligations)}
                <span className="text-xs font-normal text-[#64746B]">/mo</span>
              </div>
              <div className="text-xs text-[#64746B] mt-1">
                Evidence completeness:{' '}
                <strong className="font-mono-num text-[#17231E]">
                  {creditAssessment.dataCompletenessPct}%
                </strong>
              </div>
            </div>
          </div>

          {/* Left 7 cols: Factor Breakdown Chart + Explanations */}
          <div className="lg:col-span-7 space-y-4">
            <section className="bg-white border border-[#DCE7DF] rounded-xl p-5">
              <h3 className="font-display font-semibold text-sm text-[#17231E] mb-3">
                Six-Factor Readiness Contribution
              </h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={factorChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 20, left: 20, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EEE8" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64746B' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={145}
                      tick={{ fontSize: 11, fill: '#17231E' }}
                    />
                    <Tooltip contentStyle={{ borderColor: '#DCE7DF', fontSize: '12px' }} />
                    <Bar dataKey="Score" fill="#176B45" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 divide-y divide-[#DCE7DF] text-xs">
                {creditAssessment.factors.map((f) => (
                  <div key={f.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#17231E]">{f.label}</span>
                      <span className="font-mono-num text-[#104B32] font-semibold">
                        {f.rawScore}/100 · Weight {Math.round(f.weight * 100)}% → +
                        {f.weightedContribution} pts
                      </span>
                    </div>
                    <p className="text-[#64746B] leading-relaxed">{f.explanation}</p>
                    <div className="font-mono-num text-[11px] text-[#64746B]">
                      Evidence: {f.evidenceRefs.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right 5 cols: Loan Assumptions + Positive/Risk Factors */}
          <div className="lg:col-span-5 space-y-4">
            <section className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-4">
              <h3 className="font-display font-semibold text-sm text-[#17231E]">
                Configurable Amortization Assumptions
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#64746B]">Affordability Ratio (% of net free cash)</span>
                    <span className="font-mono-num font-semibold text-[#17231E]">
                      {Math.round(financialBaseline.affordabilityRatio * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={0.65}
                    step={0.05}
                    value={financialBaseline.affordabilityRatio}
                    onChange={(e) =>
                      setFinancialBaseline((p) => ({
                        ...p,
                        affordabilityRatio: Number(e.target.value),
                      }))
                    }
                    className="w-full eos-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#64746B]">Assumed Annual Interest Rate</span>
                    <span className="font-mono-num font-semibold text-[#17231E]">
                      {financialBaseline.interestRateAnnualPct.toFixed(1)}% p.a.
                    </span>
                  </div>
                  <input
                    type="range"
                    min={9}
                    max={22}
                    step={0.5}
                    value={financialBaseline.interestRateAnnualPct}
                    onChange={(e) =>
                      setFinancialBaseline((p) => ({
                        ...p,
                        interestRateAnnualPct: Number(e.target.value),
                      }))
                    }
                    className="w-full eos-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#64746B]">Repayment Period (Tenure)</span>
                    <span className="font-mono-num font-semibold text-[#17231E]">
                      {financialBaseline.repaymentTermMonths} months
                    </span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={60}
                    step={6}
                    value={financialBaseline.repaymentTermMonths}
                    onChange={(e) =>
                      setFinancialBaseline((p) => ({
                        ...p,
                        repaymentTermMonths: Number(e.target.value),
                      }))
                    }
                    className="w-full eos-slider"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-3 text-xs">
              <div>
                <div className="font-semibold text-[#248451] flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Main Positive Factors</span>
                </div>
                <ul className="space-y-1 text-[#17231E]">
                  {creditAssessment.positiveFactors.map((pf, i) => (
                    <li key={i}>• {pf}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-[#DCE7DF]">
                <div className="font-semibold text-[#DC4545] flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Main Risk Factors</span>
                </div>
                <ul className="space-y-1 text-[#17231E]">
                  {creditAssessment.riskFactors.map((rf, i) => (
                    <li key={i}>• {rf}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-[#DCE7DF] flex items-start gap-2 text-[11px] text-[#64746B] leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  EvidenceOS provides an indicative financial readiness and affordability
                  assessment. It does not provide an official credit bureau score, credit sanction
                  or guaranteed lending decision.
                </span>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
