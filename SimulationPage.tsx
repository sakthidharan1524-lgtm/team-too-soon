import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Network, Play, RotateCcw } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { KAVERI_BASELINE_FINANCIALS } from '../data/kaveriDemoData';
import { SimulationScenarioType } from '../types/evidenceos';
import { formatINR } from '../utils/financialEngines';

export function SimulationPage() {
  const {
    financialBaseline,
    setFinancialBaseline,
    simulationConfig,
    setSimulationConfig,
    activeSimulation,
    simulationHistory,
    executeSimulation,
    viewSimulationImpactOnGraph,
  } = useWorkspace();

  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    try {
      await executeSimulation(simulationConfig);
    } finally {
      setRunning(false);
    }
  };

  const comparisonChart = [
    {
      metric: 'Monthly Revenue',
      Baseline: activeSimulation.baselineRevenue,
      Simulated: activeSimulation.simulatedRevenue,
    },
    {
      metric: 'Operating Expenses',
      Baseline: activeSimulation.baselineExpenses,
      Simulated: activeSimulation.simulatedExpenses,
    },
    {
      metric: 'Operating Surplus',
      Baseline: activeSimulation.baselineSurplus,
      Simulated: activeSimulation.simulatedSurplus,
    },
    {
      metric: 'Loan Capacity',
      Baseline: activeSimulation.baselineLoanCapacity,
      Simulated: activeSimulation.simulatedLoanCapacity,
    },
  ];

  return (
    <div className="p-5 max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#D99124] mb-0.5">
            HYPOTHETICAL SCENARIO ENGINE · simulated: true
          </div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">
            Financial Stress Simulation Lab
          </h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            Stress-test revenue shocks, delayed customer collections, and expense inflation without
            modifying verified evidence records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFinancialBaseline(KAVERI_BASELINE_FINANCIALS)}
          className="h-9 px-3.5 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] text-xs font-medium text-[#17231E] inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#64746B]" />
          <span>Reset Demo Baseline</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Controls (5 cols) */}
        <section className="lg:col-span-5 bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-4">
          <div className="text-sm font-display font-semibold text-[#17231E]">
            Scenario & Baseline Parameters
          </div>

          {/* Scenario Type */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F0F5F1] border border-[#DCE7DF] rounded-lg">
            {(
              [
                { id: 'revenue_shock', label: 'Revenue Shock' },
                { id: 'collection_shock', label: 'Collection Shock' },
                { id: 'expense_shock', label: 'Expense Shock' },
              ] as Array<{ id: SimulationScenarioType; label: string }>
            ).map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSimulationConfig((p) => ({ ...p, scenarioType: sc.id }))}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors ${
                  simulationConfig.scenarioType === sc.id
                    ? 'bg-white text-[#104B32] font-semibold'
                    : 'text-[#64746B] hover:text-[#17231E]'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* Shock Percentage Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-[#17231E]">Shock Severity</span>
              <span className="font-mono-num font-bold text-[#104B32] text-base">
                {simulationConfig.shockPercent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={simulationConfig.shockPercent}
              onChange={(e) =>
                setSimulationConfig((p) => ({ ...p, shockPercent: Number(e.target.value) }))
              }
              className="w-full eos-slider"
            />
            <div className="flex justify-between text-[11px] font-mono-num text-[#64746B] mt-1">
              <span>0%</span>
              <span>20% default</span>
              <span>40%</span>
              <span>60%</span>
            </div>
          </div>

          {simulationConfig.scenarioType === 'revenue_shock' && (
            <label className="flex items-center gap-2 text-xs text-[#17231E] cursor-pointer">
              <input
                type="checkbox"
                checked={simulationConfig.scaleVariableCostsWithRevenue}
                onChange={(e) =>
                  setSimulationConfig((p) => ({
                    ...p,
                    scaleVariableCostsWithRevenue: e.target.checked,
                  }))
                }
                className="accent-[#176B45]"
              />
              <span>Scale variable expenses proportionally with revenue (fixed costs stay constant)</span>
            </label>
          )}

          {/* Baseline Numeric Inputs */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DCE7DF] text-xs">
            {[
              { key: 'monthlyRevenue', label: 'Monthly Revenue (₹)' },
              { key: 'fixedOperatingExpenses', label: 'Fixed Expenses (₹)' },
              { key: 'variableOperatingExpenses', label: 'Variable Expenses (₹)' },
              { key: 'outstandingReceivables', label: 'Receivables (₹)' },
              { key: 'existingMonthlyObligations', label: 'Existing Monthly EMIs (₹)' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-[11px] text-[#64746B] mb-1">{field.label}</label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={(financialBaseline as any)[field.key]}
                  onChange={(e) =>
                    setFinancialBaseline((prev) => ({
                      ...prev,
                      [field.key]: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full h-9 px-2.5 font-mono-num bg-[#F7FAF8] border border-[#DCE7DF] rounded-lg text-[#17231E] focus:outline-none focus:border-[#176B45]"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="w-full h-10 rounded-lg bg-[#176B45] hover:bg-[#104B32] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{running ? 'Executing Simulation...' : 'Run Simulation & Save Run'}</span>
          </button>
        </section>

        {/* Right Outputs & Charts (7 cols) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-semibold text-base text-[#17231E]">
                  {activeSimulation.scenarioLabel} — Impact Summary
                </h3>
                <div className="text-xs text-[#64746B] font-mono-num">
                  Run {activeSimulation.simulationId} · DSCR {activeSimulation.dscrBaseline}x →{' '}
                  {activeSimulation.dscrSimulated}x
                </div>
              </div>

              <button
                type="button"
                onClick={() => viewSimulationImpactOnGraph(activeSimulation)}
                className="px-3.5 py-2 rounded-lg border border-[#176B45] text-[#176B45] hover:bg-[#DDEFE3]/50 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Network className="w-3.5 h-3.5" />
                <span>View Impact on Graph</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF]">
                <div className="text-[#64746B]">Simulated Revenue</div>
                <div className="font-mono-num font-bold text-sm text-[#17231E] mt-1">
                  {formatINR(activeSimulation.simulatedRevenue)}
                </div>
                <div className="font-mono-num text-[11px] text-[#DC4545] mt-0.5">
                  {formatINR(activeSimulation.revenueDelta)}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF]">
                <div className="text-[#64746B]">Simulated Surplus</div>
                <div className="font-mono-num font-bold text-sm text-[#17231E] mt-1">
                  {formatINR(activeSimulation.simulatedSurplus)}
                </div>
                <div className="font-mono-num text-[11px] text-[#DC4545] mt-0.5">
                  {formatINR(activeSimulation.cashFlowImpact)}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF]">
                <div className="text-[#64746B]">Baseline Loan Cap.</div>
                <div className="font-mono-num font-bold text-sm text-[#104B32] mt-1">
                  {formatINR(activeSimulation.baselineLoanCapacity)}
                </div>
                <div className="text-[11px] text-[#64746B] mt-0.5">Verified baseline</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF]">
                <div className="text-[#64746B]">Stressed Loan Cap.</div>
                <div className="font-mono-num font-bold text-sm text-[#17231E] mt-1">
                  {formatINR(activeSimulation.simulatedLoanCapacity)}
                </div>
                <div className="font-mono-num text-[11px] text-[#DC4545] mt-0.5">
                  {formatINR(activeSimulation.loanCapacityDelta)}
                </div>
              </div>
            </div>

            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChart} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EEE8" vertical={false} />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64746B' }} />
                  <YAxis
                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 11, fill: '#64746B' }}
                  />
                  <Tooltip
                    formatter={(val: any) => formatINR(Number(val))}
                    contentStyle={{ borderColor: '#DCE7DF', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Baseline" fill="#176B45" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Simulated" fill="#D99124" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-2 border-t border-[#DCE7DF] text-xs text-[#64746B] space-y-1">
              <div className="font-semibold text-[#17231E]">Model Assumptions Applied:</div>
              {activeSimulation.assumptionsUsed.map((a, idx) => (
                <div key={idx}>• {a}</div>
              ))}
            </div>
          </div>

          {/* Isolated Simulation History Table */}
          <div className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DCE7DF] flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-[#17231E]">
                Saved Simulation Runs ({simulationHistory.length})
              </h3>
              <span className="text-[11px] font-mono-num text-[#64746B]">
                Isolated collection · simulated: true
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7FAF8] border-b border-[#DCE7DF] text-[#64746B]">
                    <th className="py-2 px-4 font-semibold">Run ID</th>
                    <th className="py-2 px-3 font-semibold">Scenario</th>
                    <th className="py-2 px-3 font-semibold text-right">Sim Surplus</th>
                    <th className="py-2 px-3 font-semibold text-right">Sim Loan Cap.</th>
                    <th className="py-2 px-4 font-semibold text-right">Graph</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE7DF]">
                  {simulationHistory.map((sim) => (
                    <tr key={sim.simulationId} className="hover:bg-[#F7FAF8]">
                      <td className="py-2.5 px-4 font-mono-num text-[#17231E]">
                        {sim.simulationId}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#17231E]">
                        {sim.scenarioLabel}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-[#17231E]">
                        {formatINR(sim.simulatedSurplus)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-[#104B32] font-semibold">
                        {formatINR(sim.simulatedLoanCapacity)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => viewSimulationImpactOnGraph(sim)}
                          className="text-[#176B45] font-semibold hover:underline"
                        >
                          Overlay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
