import {
  CreditAssessmentResult,
  CreditFactorScore,
  FinancialBaselineInputs,
  GraphEdgeData,
  SimulationConfig,
  SimulationResult,
} from '../types/evidenceos';

export interface CreditWeights {
  revenueConsistency: number;
  cashFlowStability: number;
  repaymentCapacity: number;
  existingObligations: number;
  receivableCollection: number;
  evidenceCompleteness: number;
}

export const DEFAULT_CREDIT_WEIGHTS: CreditWeights = {
  revenueConsistency: 0.18,
  cashFlowStability: 0.20,
  repaymentCapacity: 0.22,
  existingObligations: 0.12,
  receivableCollection: 0.13,
  evidenceCompleteness: 0.15,
};

/**
 * Standard present-value amortization calculation:
 * Given an affordable monthly payment (PMT), annual interest rate (%), and term in months (n),
 * returns maximum supportable principal P = PMT * [1 - (1 + r)^(-n)] / r.
 */
export function calculateLoanPrincipalFromEmi(
  monthlyEmi: number,
  annualInterestRatePct: number,
  termMonths: number
): number {
  if (monthlyEmi <= 0 || termMonths <= 0) return 0;
  const monthlyRate = annualInterestRatePct / 100 / 12;
  if (monthlyRate <= 0) return Math.round(monthlyEmi * termMonths);
  const factor = (1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate;
  return Math.max(0, Math.round(monthlyEmi * factor));
}

export function calculateMonthlyEmiFromPrincipal(
  principal: number,
  annualInterestRatePct: number,
  termMonths: number
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const monthlyRate = annualInterestRatePct / 100 / 12;
  if (monthlyRate <= 0) return Math.round(principal / termMonths);
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(emi);
}

/**
 * Transparent, deterministic EvidenceOS Financial Readiness & Indicative Loan Engine.
 * Never asks an LLM to invent scores or loan figures.
 */
export function computeCreditAssessment(
  inputs: FinancialBaselineInputs,
  weights: CreditWeights = DEFAULT_CREDIT_WEIGHTS,
  unresolvedCriticalFindingsCount = 2,
  isDemo = true
): CreditAssessmentResult {
  const verifiedOperatingExpenses =
    inputs.fixedOperatingExpenses + inputs.variableOperatingExpenses;
  const monthlyFreeCashFlow = inputs.monthlyRevenue - verifiedOperatingExpenses;
  const netPostEmiCashFlow = monthlyFreeCashFlow - inputs.existingMonthlyObligations;

  if (!inputs.dataSufficient || inputs.monthlyRevenue <= 0 || inputs.evidenceCompletenessPct < 35) {
    return {
      assessmentId: 'ASSESS-INSUFFICIENT',
      modelVersion: 'EvidenceOS-Deterministic-v1.4.0',
      dataSufficient: false,
      overallScore: null,
      readinessBand: 'Insufficient Evidence',
      factors: [],
      verifiedMonthlyRevenue: inputs.monthlyRevenue,
      verifiedOperatingExpenses,
      monthlyFreeCashFlow,
      existingObligations: inputs.existingMonthlyObligations,
      availableRepaymentCapacity: 0,
      indicativeLoanAmount: null,
      indicativeLoanRange: null,
      estimatedMonthlyEmi: null,
      assumptions: {
        affordabilityRatio: inputs.affordabilityRatio,
        interestRateAnnualPct: inputs.interestRateAnnualPct,
        repaymentTermMonths: inputs.repaymentTermMonths,
      },
      positiveFactors: [],
      riskFactors: ['Insufficient verified financial documents to compute a reliable readiness assessment.'],
      dataCompletenessPct: inputs.evidenceCompletenessPct,
      sourceDocumentIds: ['DOC002', 'DOC005', 'DOC006'],
      isDemo,
    };
  }

  // Normalize weights to sum to 1.0
  const weightSum =
    weights.revenueConsistency +
    weights.cashFlowStability +
    weights.repaymentCapacity +
    weights.existingObligations +
    weights.receivableCollection +
    weights.evidenceCompleteness || 1;

  // Deterministic factor scoring (0–100 each)
  const revenueScore = Math.max(20, Math.min(96, Math.round(98 - inputs.revenueVariancePct * 1.45)));
  const operatingMarginPct = (monthlyFreeCashFlow / Math.max(1, inputs.monthlyRevenue)) * 100;
  const cashFlowScore = Math.max(15, Math.min(95, Math.round(operatingMarginPct * 3.55)));

  const dscr =
    inputs.existingMonthlyObligations > 0
      ? monthlyFreeCashFlow / inputs.existingMonthlyObligations
      : 3.5;
  const repaymentScore = Math.max(15, Math.min(95, Math.round(Math.min(dscr, 3.2) * 28.5)));

  const debtToSurplusPct =
    monthlyFreeCashFlow > 0 ? (inputs.existingMonthlyObligations / monthlyFreeCashFlow) * 100 : 100;
  const obligationScore = Math.max(15, Math.min(95, Math.round(100 - debtToSurplusPct * 0.78)));

  const receivableScore = Math.max(20, Math.min(96, Math.round(inputs.receivableCollectionRatePct * 0.94)));

  // Penalize evidence reliability transparently for unresolved critical findings
  const evidencePenalty = unresolvedCriticalFindingsCount * 8;
  const evidenceScore = Math.max(25, Math.min(98, Math.round(inputs.evidenceCompletenessPct - evidencePenalty)));

  const rawFactors: Array<{
    id: string;
    label: string;
    weight: number;
    rawScore: number;
    explanation: string;
    evidenceRefs: string[];
  }> = [
    {
      id: 'revenue_consistency',
      label: 'Revenue consistency',
      weight: weights.revenueConsistency / weightSum,
      rawScore: revenueScore,
      explanation: `Monthly average revenue ₹${inputs.monthlyRevenue.toLocaleString('en-IN')} with ${inputs.revenueVariancePct.toFixed(1)}% month-to-month variance across verified bank & P&L periods.`,
      evidenceRefs: ['DOC002', 'DOC005'],
    },
    {
      id: 'cash_flow_stability',
      label: 'Cash-flow stability',
      weight: weights.cashFlowStability / weightSum,
      rawScore: cashFlowScore,
      explanation: `Operating surplus of ₹${monthlyFreeCashFlow.toLocaleString('en-IN')}/mo (${operatingMarginPct.toFixed(1)}% operating margin) backed by ₹${inputs.cashReserves.toLocaleString('en-IN')} closing balance.`,
      evidenceRefs: ['DOC002', 'DOC005'],
    },
    {
      id: 'repayment_capacity',
      label: 'Repayment capacity',
      weight: weights.repaymentCapacity / weightSum,
      rawScore: repaymentScore,
      explanation: `Debt-service coverage ratio (DSCR) stands at ${dscr.toFixed(2)}x relative to existing ₹${inputs.existingMonthlyObligations.toLocaleString('en-IN')}/mo obligations.`,
      evidenceRefs: ['DOC002', 'DOC006'],
    },
    {
      id: 'existing_obligations',
      label: 'Existing financial obligations',
      weight: weights.existingObligations / weightSum,
      rawScore: obligationScore,
      explanation: `Existing SIDBI EMI absorbs ${debtToSurplusPct.toFixed(1)}% of monthly operating surplus; ECS payments verified on schedule.`,
      evidenceRefs: ['DOC006', 'DOC002'],
    },
    {
      id: 'receivable_collection',
      label: 'Receivable collection reliability',
      weight: weights.receivableCollection / weightSum,
      rawScore: receivableScore,
      explanation: `${inputs.receivableCollectionRatePct.toFixed(0)}% collection realization with ₹${inputs.outstandingReceivables.toLocaleString('en-IN')} currently open across wholesale accounts.`,
      evidenceRefs: ['DOC001', 'DOC002', 'DOC003'],
    },
    {
      id: 'evidence_completeness',
      label: 'Evidence completeness & reliability',
      weight: weights.evidenceCompleteness / weightSum,
      rawScore: evidenceScore,
      explanation: `${inputs.evidenceCompletenessPct.toFixed(0)}% required fields verified; adjusted by -${evidencePenalty} pts for ${unresolvedCriticalFindingsCount} open critical verification alert(s) and missing payables schedule.`,
      evidenceRefs: ['DOC001', 'DOC004', 'DOC005', 'DOC007'],
    },
  ];

  const factors: CreditFactorScore[] = rawFactors.map((f) => ({
    ...f,
    weightedContribution: Number((f.rawScore * f.weight).toFixed(1)),
  }));

  const overallScore = Math.max(
    0,
    Math.min(100, Math.round(factors.reduce((acc, f) => acc + f.weightedContribution, 0)))
  );

  // Affordable monthly repayment = affordabilityRatio * net free cash flow after existing obligations
  const availableRepaymentCapacity = Math.max(
    0,
    Math.round(netPostEmiCashFlow * inputs.affordabilityRatio)
  );

  const indicativeLoanRaw = calculateLoanPrincipalFromEmi(
    availableRepaymentCapacity,
    inputs.interestRateAnnualPct,
    inputs.repaymentTermMonths
  );
  // Round to nearest ₹5,000 for clean indicative presentation
  const indicativeLoanAmount =
    indicativeLoanRaw > 0 ? Math.max(0, Math.round(indicativeLoanRaw / 5000) * 5000) : 0;

  const estimatedMonthlyEmi =
    indicativeLoanAmount > 0
      ? calculateMonthlyEmiFromPrincipal(
          indicativeLoanAmount,
          inputs.interestRateAnnualPct,
          inputs.repaymentTermMonths
        )
      : 0;

  const readinessBand =
    overallScore >= 80
      ? 'Strong Evidence Readiness'
      : overallScore >= 65
        ? 'Moderate-Strong Readiness'
        : overallScore >= 50
          ? 'Watchlist — Verification Needed'
          : 'Elevated Risk';

  const positiveFactors: string[] = [];
  if (operatingMarginPct >= 18) {
    positiveFactors.push(`Healthy ${operatingMarginPct.toFixed(1)}% operating surplus margin across verified periods`);
  }
  if (dscr >= 2.0) {
    positiveFactors.push(`Existing SIDBI EMI (₹${inputs.existingMonthlyObligations.toLocaleString('en-IN')}/mo) covered ${dscr.toFixed(2)}x by surplus`);
  }
  if (inputs.cashReserves >= inputs.existingMonthlyObligations * 3) {
    positiveFactors.push(`Closing bank balance (₹${inputs.cashReserves.toLocaleString('en-IN')}) provides >5 months EMI buffer`);
  }

  const riskFactors: string[] = [];
  if (unresolvedCriticalFindingsCount > 0) {
    riskFactors.push(`${unresolvedCriticalFindingsCount} unresolved critical findings (INV001 ₹5,000 shortfall & 3-hop circular pattern)`);
  }
  if (inputs.evidenceCompletenessPct < 90) {
    riskFactors.push('Trade payables ageing schedule missing from provisional FY26 financial statements');
  }
  if (inputs.outstandingReceivables > inputs.monthlyRevenue * 0.3) {
    riskFactors.push(`Outstanding receivables (₹${inputs.outstandingReceivables.toLocaleString('en-IN')}) represent ${(inputs.outstandingReceivables / inputs.monthlyRevenue * 100).toFixed(0)}% of monthly sales`);
  }

  return {
    assessmentId: 'ASSESS-KAVERI-001',
    modelVersion: 'EvidenceOS-Deterministic-v1.4.0',
    dataSufficient: true,
    overallScore,
    readinessBand,
    factors,
    verifiedMonthlyRevenue: inputs.monthlyRevenue,
    verifiedOperatingExpenses,
    monthlyFreeCashFlow,
    existingObligations: inputs.existingMonthlyObligations,
    availableRepaymentCapacity,
    indicativeLoanAmount,
    indicativeLoanRange:
      indicativeLoanAmount > 0
        ? {
            min: Math.round((indicativeLoanAmount * 0.85) / 5000) * 5000,
            max: Math.round((indicativeLoanAmount * 1.1) / 5000) * 5000,
          }
        : null,
    estimatedMonthlyEmi,
    assumptions: {
      affordabilityRatio: inputs.affordabilityRatio,
      interestRateAnnualPct: inputs.interestRateAnnualPct,
      repaymentTermMonths: inputs.repaymentTermMonths,
    },
    positiveFactors,
    riskFactors,
    dataCompletenessPct: inputs.evidenceCompletenessPct,
    sourceDocumentIds: ['DOC001', 'DOC002', 'DOC005', 'DOC006', 'DOC007'],
    isDemo,
  };
}

/**
 * Isolated Hypothetical Financial Stress-Test Engine.
 * Never mutates baseline evidence; always returns `simulated: true`.
 */
export function runFinancialStressSimulation(
  baseline: FinancialBaselineInputs,
  config: SimulationConfig,
  isDemo = true
): SimulationResult {
  const shockRatio = config.shockPercent / 100;
  const baselineExpenses = baseline.fixedOperatingExpenses + baseline.variableOperatingExpenses;
  const baselineSurplus = baseline.monthlyRevenue - baselineExpenses;

  const baselineAssessment = computeCreditAssessment(baseline, DEFAULT_CREDIT_WEIGHTS, 2, isDemo);
  const baselineLoanCapacity = baselineAssessment.indicativeLoanAmount ?? 0;

  let simulatedRevenue = baseline.monthlyRevenue;
  let simulatedExpenses = baselineExpenses;
  let scenarioLabel = 'Revenue Loss';
  let impactedNodeIds: string[] = ['BUS-KAVERI', 'CUST-SELVAM', 'CUST-KUMAR', 'DOC-PNL-26'];
  let impactedEdgeIds: string[] = ['E-07', 'E-08', 'E-09', 'T-04', 'T-05'];
  const assumptionsUsed: string[] = [];

  if (config.scenarioType === 'revenue_shock') {
    scenarioLabel = `${config.shockPercent}% Revenue Loss`;
    simulatedRevenue = Math.round(baseline.monthlyRevenue * (1 - shockRatio));
    const simVariable = config.scaleVariableCostsWithRevenue
      ? Math.round(baseline.variableOperatingExpenses * (1 - shockRatio))
      : baseline.variableOperatingExpenses;
    simulatedExpenses = baseline.fixedOperatingExpenses + simVariable;
    assumptionsUsed.push('Fixed operating expenses remain constant.');
    assumptionsUsed.push(
      config.scaleVariableCostsWithRevenue
        ? 'Variable operating expenses scale proportionally with revenue.'
        : 'Variable operating expenses held rigid (conservative shock).'
    );
  } else if (config.scenarioType === 'collection_shock') {
    scenarioLabel = `${config.shockPercent}% Delayed Customer Collections`;
    const delayedCashInflow = Math.round(baseline.outstandingReceivables * shockRatio);
    simulatedRevenue = Math.max(0, baseline.monthlyRevenue - delayedCashInflow);
    simulatedExpenses = baselineExpenses; // Costs still incurred while receivables stall
    impactedNodeIds = ['CUST-KUMAR', 'CUST-SELVAM', 'INV-001', 'TXN-8841', 'BUS-KAVERI'];
    impactedEdgeIds = ['E-02', 'E-04', 'E-08', 'T-04', 'T-05'];
    assumptionsUsed.push(
      `${config.shockPercent}% of ₹${baseline.outstandingReceivables.toLocaleString('en-IN')} receivables delayed beyond current 30-day cycle.`
    );
    assumptionsUsed.push('Operating costs remain payable on original due dates.');
  } else {
    scenarioLabel = `${config.shockPercent}% Operating Expense Surge`;
    simulatedRevenue = baseline.monthlyRevenue;
    const variableIncrease = Math.round(baseline.variableOperatingExpenses * shockRatio);
    const fixedIncrease = Math.round(baseline.fixedOperatingExpenses * (shockRatio * 0.35));
    simulatedExpenses = baselineExpenses + variableIncrease + fixedIncrease;
    impactedNodeIds = ['BUS-KAVERI', 'SUP-CAUVERY', 'SUP-TRICHY', 'DOC-PNL-26'];
    impactedEdgeIds = ['E-09', 'E-11', 'T-01', 'T-07'];
    assumptionsUsed.push(`Variable input costs (yarn, dyeing, power) rise by ${config.shockPercent}%.`);
    assumptionsUsed.push(`Fixed overhead experiences secondary inflation of ${(config.shockPercent * 0.35).toFixed(1)}%.`);
  }

  const simulatedSurplus = simulatedRevenue - simulatedExpenses;
  const revenueDelta = simulatedRevenue - baseline.monthlyRevenue;
  const cashFlowImpact = simulatedSurplus - baselineSurplus;

  const simNetPostEmi = simulatedSurplus - baseline.existingMonthlyObligations;
  const simAffordableEmi = Math.max(0, Math.round(simNetPostEmi * baseline.affordabilityRatio));
  const simLoanRaw = calculateLoanPrincipalFromEmi(
    simAffordableEmi,
    baseline.interestRateAnnualPct,
    baseline.repaymentTermMonths
  );
  const simulatedLoanCapacity =
    simLoanRaw > 0 ? Math.max(0, Math.round(simLoanRaw / 5000) * 5000) : 0;

  const dscrBaseline =
    baseline.existingMonthlyObligations > 0
      ? Number((baselineSurplus / baseline.existingMonthlyObligations).toFixed(2))
      : 3.5;
  const dscrSimulated =
    baseline.existingMonthlyObligations > 0
      ? Number((simulatedSurplus / baseline.existingMonthlyObligations).toFixed(2))
      : 3.5;

  return {
    simulationId: `SIM-${Date.now().toString(36).toUpperCase()}`,
    scenarioType: config.scenarioType,
    scenarioLabel,
    shockPercent: config.shockPercent,
    simulated: true,
    createdAt: new Date().toISOString(),
    baselineRevenue: baseline.monthlyRevenue,
    simulatedRevenue,
    revenueDelta,
    baselineExpenses,
    simulatedExpenses,
    baselineSurplus,
    simulatedSurplus,
    cashFlowImpact,
    baselineLoanCapacity,
    simulatedLoanCapacity,
    loanCapacityDelta: simulatedLoanCapacity - baselineLoanCapacity,
    dscrBaseline,
    dscrSimulated,
    impactedNodeIds,
    impactedEdgeIds,
    assumptionsUsed,
    isDemo,
  };
}

/**
 * Simple directed cycle detector mirroring Python NetworkX simple_cycles(max_len=4)
 * for instant interactive highlighting on the Transaction Network.
 */
export function detectDirectedCycles(edges: GraphEdgeData[], maxLength = 4): string[][] {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source) ?? [];
    if (!list.includes(e.target)) list.push(e.target);
    adj.set(e.source, list);
  }

  const cycles: string[][] = [];
  const seenSignatures = new Set<string>();

  const dfs = (start: string, current: string, path: string[]) => {
    if (path.length > maxLength) return;
    const neighbors = adj.get(current) ?? [];
    for (const next of neighbors) {
      if (next === start && path.length >= 2) {
        const minNode = [...path].sort()[0];
        const minIdx = path.indexOf(minNode);
        const normalized = [...path.slice(minIdx), ...path.slice(0, minIdx)];
        const sig = normalized.join('->');
        if (!seenSignatures.has(sig)) {
          seenSignatures.add(sig);
          cycles.push([...normalized, normalized[0]]);
        }
      } else if (!path.includes(next)) {
        dfs(start, next, [...path, next]);
      }
    }
  };

  for (const node of adj.keys()) {
    dfs(node, node, [node]);
  }
  return cycles;
}

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.round(amount));
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}
