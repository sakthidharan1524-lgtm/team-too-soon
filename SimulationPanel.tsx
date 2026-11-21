import React, { useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Network, Play } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { SimulationScenarioType } from '../../types/evidenceos';
import { formatINR } from '../../utils/financialEngines';

const SCENARIO_OPTIONS: Array<{ id: SimulationScenarioType; label: string; shortLabel: string }> = [
  { id: 'revenue_shock', label: 'Revenue reduction', shortLabel: 'Revenue Loss' },
  { id: 'collection_shock', label: 'Delayed customer collections', shortLabel: 'Delayed Cash' },
  { id: 'expense_shock', label: 'Increased operating expenses', shortLabel: 'Expense Surge' },
];

export function SimulationPanel() {
  const {
    simulationConfig,
    setSimulationConfig,
    activeSimulation,
    executeSimulation,
    viewSimulationImpactOnGraph,
  } = useWorkspace();

  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await executeSimulation(simulationConfig);
    } finally {
      setIsRunning(false);
    }
  };

  const chartData = [
    {
      name: 'Revenue',
      Baseline: activeSimulation.baselineRevenue,
      Simulated: activeSimulation.simulatedRevenue,
    },
    {
      name: 'Surplus',
      Baseline: activeSimulation.baselineSurplus,
      Simulated: activeSimulation.simulatedSurplus,
    },
  ];

  return (
    <section className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#DCE7DF] flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-semibold text-[14px] text-[#17231E] leading-tight">
            AI Financial Stress Test
          </h2>
          <div className="text-[11px] font-semibold text-[#D99124] mt-0.5">
            HYPOTHETICAL SCENARIO · Never alters actual evidence
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Scenario Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#F0F5F1] border border-[#DCE7DF] rounded-lg">
          {SCENARIO_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                setSimulationConfig((prev) => ({
                  ...prev,
                  scenarioType: opt.id,
                }))
              }
              className={`py-1.5 px-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                simulationConfig.scenarioType === opt.id
                  ? 'bg-white text-[#104B32] font-semibold'
                  : 'text-[#64746B] hover:text-[#17231E]'
              }`}
            >
              {opt.shortLabel}
            </button>
          ))}
        </div>

        {/* Shock Percentage Slider (Default 20%, 0-60%, step 5%) */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#17231E]">
              {simulationConfig.scenarioType === 'revenue_shock'
                ? 'Revenue Loss Shock'
                : simulationConfig.scenarioType === 'collection_shock'
                  ? 'Delayed Receivables Shock'
                  : 'Operating Expense Shock'}
            </span>
            <span className="font-mono-num font-bold text-[#104B32] text-sm">
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
              setSimulationConfig((prev) => ({
                ...prev,
                shockPercent: Number(e.target.value),
              }))
            }
            className="w-full eos-slider"
            aria-label="Stress test shock percentage"
          />
          <div className="flex justify-between text-[10px] font-mono-num text-[#64746B] mt-1">
            <span>0%</span>
            <span>20% default</span>
            <span>40%</span>
            <span>60%</span>
          </div>
        </div>

        {/* Prominent Run Simulation Button */}
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="w-full h-9 rounded-lg bg-[#176B45] hover:bg-[#104B32] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isRunning ? 'Running Stress Test...' : 'Run Simulation'}</span>
        </button>

        {/* Compact Comparison Metrics */}
        <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
          <div className="p-2.5 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF]">
            <div className="text-[11px] text-[#64746B]">Monthly Surplus</div>
            <div className="font-mono-num font-bold text-[#17231E] text-sm mt-0.5">
              {formatINR(activeSimulation.simulatedSurplus)}
            </div>
            <div className="font-mono-num text-[11px] text-[#DC4545] mt-0.5">
              {formatINR(activeSimulation.cashFlowImpact)} vs {formatINR(activeSimulation.baselineSurplus)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#F7FAF8] border border-[#DCE7DF]">
            <div className="text-[11px] text-[#64746B]">Simulated Loan Cap.</div>
            <div className="font-mono-num font-bold text-[#17231E] text-sm mt-0.5">
              {formatINR(activeSimulation.simulatedLoanCapacity)}
            </div>
            <div className="font-mono-num text-[11px] text-[#DC4545] mt-0.5">
              {formatINR(activeSimulation.loanCapacityDelta)} vs {formatINR(activeSimulation.baselineLoanCapacity)}
            </div>
          </div>
        </div>

        {/* Compact Baseline vs Simulated Chart */}
        <div className="h-[118px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64746B' }}
                axisLine={{ stroke: '#DCE7DF' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                tick={{ fontSize: 10, fill: '#64746B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => formatINR(Number(value))}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DCE7DF',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="Baseline" fill="#176B45" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="Simulated" radius={[4, 4, 0, 0]} maxBarSize={26}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.Simulated < 0 ? '#DC4545' : '#D99124'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph Integration Action */}
        <div className="flex items-center justify-between pt-2 border-t border-[#DCE7DF]">
          <span className="text-[11px] text-[#64746B]">
            Run ID: <span className="font-mono-num">{activeSimulation.simulationId}</span>
          </span>
          <button
            type="button"
            onClick={() => viewSimulationImpactOnGraph(activeSimulation)}
            className="text-xs font-semibold text-[#176B45] hover:text-[#104B32] inline-flex items-center gap-1 transition-colors"
          >
            <Network className="w-3.5 h-3.5" />
            <span>View Impact on Graph</span>
          </button>
        </div>
      </div>
    </section>
  );
}
