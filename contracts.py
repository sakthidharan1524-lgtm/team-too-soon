from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ExtractedRecordSchema(BaseModel):
    recordId: str
    documentId: str
    pageNumber: int = 1
    recordType: str
    counterparty: Optional[str] = None
    dateOriginal: Optional[str] = None
    dateISO: Optional[str] = None
    amountOriginal: Optional[str] = None
    amountNormalized: Optional[str] = None
    currency: str = "INR"
    direction: Literal["credit", "debit", "neutral"] = "neutral"
    evidenceText: str
    readability: Literal["clear", "partial", "illegible"] = "clear"
    needsManualReview: bool = False


class FindingSchema(BaseModel):
    findingId: str
    findingType: str
    severity: Literal["Critical", "Warning", "Information"]
    description: str
    explanation: str
    affectedRecords: List[str] = Field(default_factory=list)
    sourceDocumentIds: List[str] = Field(default_factory=list)
    detectionRule: str
    evidenceStatus: Literal[
        "CORROBORATED",
        "CONTRADICTED",
        "INSUFFICIENT_EVIDENCE",
        "REQUIRES_MANUAL_REVIEW",
        "POSSIBLE_ANOMALY",
    ]
    reviewStatus: str = "Requires Manual Review"


class CreditInputsSchema(BaseModel):
    monthlyRevenue: float
    fixedOperatingExpenses: float
    variableOperatingExpenses: float
    outstandingReceivables: float
    existingMonthlyObligations: float
    cashReserves: float = 200000.0
    revenueVariancePct: float = 11.4
    receivableCollectionRatePct: float = 84.0
    evidenceCompletenessPct: float = 86.0
    interestRateAnnualPct: float = 14.5
    repaymentTermMonths: int = 36
    affordabilityRatio: float = 0.50
    dataSufficient: bool = True


class SimulationRequestSchema(BaseModel):
    scenarioType: Literal["revenue_shock", "collection_shock", "expense_shock"] = "revenue_shock"
    shockPercent: float = Field(default=20.0, ge=0.0, le=60.0)
    scaleVariableCostsWithRevenue: bool = True
    baseline: Optional[CreditInputsSchema] = None


class SimulationResponseSchema(BaseModel):
    simulationId: str
    scenarioType: str
    shockPercent: float
    simulated: Literal[True] = True
    createdAt: datetime
    baselineRevenue: float
    simulatedRevenue: float
    baselineExpenses: float
    simulatedExpenses: float
    baselineSurplus: float
    simulatedSurplus: float
    cashFlowImpact: float
    baselineLoanCapacity: float
    simulatedLoanCapacity: float
    loanCapacityDelta: float
    assumptionsUsed: List[str]


class InvestigatorQuerySchema(BaseModel):
    businessId: str = "kaveri_textiles"
    query: str
    mode: Literal["deep_thinking", "fast_lite", "search_grounded"] = "deep_thinking"


class ErrorResponseSchema(BaseModel):
    error: str
    detail: Optional[Dict[str, Any]] = None
