import React, { useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { FinancialNetworkGraph } from '../components/graph/FinancialNetworkGraph';
import { FindingsPanel } from '../components/panels/FindingsPanel';
import { CreditAssessmentPanel } from '../components/panels/CreditAssessmentPanel';
import { SimulationPanel } from '../components/panels/SimulationPanel';

export function OverviewPage() {
  const [rightCollapsedOnTablet, setRightCollapsedOnTablet] = useState(false);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto lg:overflow-hidden">
      {/* Tablet Panel Collapse Toggle */}
      <div className="hidden md:flex lg:hidden items-center justify-end">
        <button
          type="button"
          onClick={() => setRightCollapsedOnTablet((v) => !v)}
          className="px-3 py-1.5 text-xs font-medium text-[#17231E] bg-white border border-[#DCE7DF] rounded-lg inline-flex items-center gap-1.5 hover:bg-[#F0F5F1]"
        >
          {rightCollapsedOnTablet ? (
            <>
              <PanelRightOpen className="w-3.5 h-3.5 text-[#176B45]" />
              <span>Show Intelligence Panels</span>
            </>
          ) : (
            <>
              <PanelRightClose className="w-3.5 h-3.5 text-[#64746B]" />
              <span>Collapse Intelligence Panels</span>
            </>
          )}
        </button>
      </div>

      {/* LEFT SECTION (~68% on desktop): Dominant Financial Evidence / Transaction Network */}
      <div
        className={`w-full min-h-[500px] lg:min-h-0 lg:h-full transition-[width] duration-200 ${
          rightCollapsedOnTablet ? 'lg:w-full' : 'lg:w-[68%]'
        }`}
      >
        <FinancialNetworkGraph heightClass="h-[520px] lg:h-full" />
      </div>

      {/* RIGHT SECTION (~32% on desktop): Exactly 3 Vertically Stacked Independently Scrollable Intelligence Panels */}
      {!rightCollapsedOnTablet && (
        <div className="w-full lg:w-[32%] lg:h-full lg:overflow-y-auto lg:pr-0.5 space-y-4 shrink-0">
          {/* PANEL 1 — FINDINGS & ERRORS */}
          <FindingsPanel />

          {/* PANEL 2 — CREDIT ASSESSMENT & LOAN ESTIMATION */}
          <CreditAssessmentPanel />

          {/* PANEL 3 — AI FINANCIAL SIMULATION */}
          <SimulationPanel />
        </div>
      )}
    </div>
  );
}
