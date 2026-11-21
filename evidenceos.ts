export type PageRoute =
  | 'overview'
  | 'evidence-network'
  | 'document-upload'
  | 'document-verification'
  | 'transaction-investigation'
  | 'ai-investigator'
  | 'simulation-lab'
  | 'credit-assessment'
  | 'reports'
  | 'audit-trail'
  | 'integrations'
  | 'settings'
  | 'help';

export type GraphMode = 'evidence' | 'transactions';

export type DocumentCategory =
  | 'identity'
  | 'bank'
  | 'financial_statement'
  | 'loan'
  | 'transaction_evidence'
  | 'communication'
  | 'video_evidence';

export type VerificationStatus =
  | 'Extracted'
  | 'Complete'
  | 'Missing Information'
  | 'Unreadable'
  | 'Inconsistent'
  | 'Requires Manual Review'
  | 'Insufficient Evidence';

export type FindingStatus =
  | 'Critical'
  | 'Warning'
  | 'Information'
  | 'Resolved'
  | 'Requires Manual Review';

export type EvidenceVerificationCode =
  | 'CORROBORATED'
  | 'CONTRADICTED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'REQUIRES_MANUAL_REVIEW'
  | 'POSSIBLE_ANOMALY';

export type GraphNodeType =
  | 'business'
  | 'customer'
  | 'supplier'
  | 'invoice'
  | 'bank_transaction'
  | 'bank_statement'
  | 'whatsapp_message'
  | 'financial_document';

export type GraphRelationshipType =
  | 'ISSUED_TO'
  | 'BELONGS_TO'
  | 'MENTIONS'
  | 'SUPPORTS'
  | 'MATCHES'
  | 'CONTRADICTS'
  | 'CLAIMS_PAYMENT'
  | 'PAYS'
  | 'RECEIVES'
  | 'TRANSFERS_TO'
  | 'SOURCE_OF';

export interface BusinessWorkspace {
  id: string;
  name: string;
  sector: string;
  location: string;
  gstin: string;
  udyamId: string;
  panMasked: string;
  isDemo: boolean;
}

export interface ExtractedRecord {
  recordId: string;
  documentId: string;
  pageNumber: number;
  recordType: string;
  fieldLabel: string;
  counterparty?: string;
  dateOriginal?: string;
  dateISO?: string;
  amountOriginal?: string;
  amountNormalized?: string | null;
  currency?: string;
  direction?: 'credit' | 'debit' | 'neutral';
  evidenceText: string;
  normalizedValue: string | null;
  readability: 'clear' | 'partial' | 'illegible';
  needsManualReview: boolean;
  correctedValue?: string;
  correctionReason?: string;
}

export interface CompletenessCheckItem {
  field: string;
  required: boolean;
  present: boolean;
  valuePreview?: string;
}

export interface DocumentRecheckFieldResult {
  recordId: string;
  fieldLabel: string;
  recordedValue: string | null;
  geminiRecheckedValue: string | null;
  matchScorePct: number;
  status: 'matched' | 'partial' | 'mismatch' | 'unreadable';
  note: string;
}

export interface DocumentAuthenticityReport {
  isAiGeneratedOrSynthetic: boolean;
  originClassification:
    | 'Synthetic Demo Document'
    | 'AI-Generated / Synthetic Indicators Detected'
    | 'Likely Authentic / Human-Authored'
    | 'Inconclusive — Manual Review Needed';
  syntheticLikelihoodPct: number;
  geminiMatchPercentage: number;
  matchedFieldsCount: number;
  totalFieldsChecked: number;
  recheckSource: 'baseline_demo' | 'live_gemini_recheck';
  modelUsed: string;
  lastCheckedAt: string;
  forensicSignals: string[];
  fieldComparisons: DocumentRecheckFieldResult[];
  summaryNote: string;
}

export interface EvidenceDocumentItem {
  id: string;
  businessId: string;
  fileName: string;
  category: DocumentCategory;
  subcategory: string;
  uploadDate: string;
  fileSize: number;
  mimeType: string;
  uploadStatus: 'uploaded' | 'processing' | 'failed';
  ocrStatus: 'pending' | 'completed' | 'partial' | 'failed' | 'not_applicable';
  verificationStatus: VerificationStatus;
  language: string;
  pageCount: number;
  sha256Short: string;
  extractedSummary: string;
  previewText: string;
  previewDataUrl?: string;
  originalFileUrl?: string;
  originalRawText?: string;
  isDemo: boolean;
  records: ExtractedRecord[];
  completenessChecks: CompletenessCheckItem[];
  internalConsistencyNotes: string[];
  authenticityReport?: DocumentAuthenticityReport;
}

export interface GraphNodeData {
  id: string;
  label: string;
  nodeType: GraphNodeType;
  identifier: string;
  amount?: number;
  currency?: string;
  date?: string;
  verificationStatus: EvidenceVerificationCode;
  sourceDocumentId?: string;
  metadata?: Record<string, string>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  relationship: GraphRelationshipType;
  amount?: number;
  currency?: string;
  date?: string;
  description: string;
  sourceDocumentId: string;
  sourcePage?: number;
  extractedRecordId?: string;
  matchingMethod: string;
  matchRationale: string;
  verificationStatus: EvidenceVerificationCode;
  isCycleEdge?: boolean;
  isDiscrepancyEdge?: boolean;
}

export interface VerificationFinding {
  id: string;
  findingType: string;
  title: string;
  severity: 'Critical' | 'Warning' | 'Information';
  status: FindingStatus;
  evidenceStatus: EvidenceVerificationCode;
  affectedEntity: string;
  affectedAmount?: number;
  comparison?: {
    labelA: string;
    valueA: number;
    labelB: string;
    valueB: number;
    difference: number;
  };
  reason: string;
  detectionRule: string;
  sourceDocumentIds: string[];
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  analystNote?: string;
  isDemo: boolean;
}

export interface FinancialBaselineInputs {
  monthlyRevenue: number;
  fixedOperatingExpenses: number;
  variableOperatingExpenses: number;
  outstandingReceivables: number;
  existingMonthlyObligations: number;
  cashReserves: number;
  revenueVariancePct: number;
  receivableCollectionRatePct: number;
  evidenceCompletenessPct: number;
  interestRateAnnualPct: number;
  repaymentTermMonths: number;
  affordabilityRatio: number;
  dataSufficient: boolean;
}

export interface CreditFactorScore {
  id: string;
  label: string;
  weight: number;
  rawScore: number;
  weightedContribution: number;
  explanation: string;
  evidenceRefs: string[];
}

export interface CreditAssessmentResult {
  assessmentId: string;
  modelVersion: string;
  dataSufficient: boolean;
  overallScore: number | null;
  readinessBand: string;
  factors: CreditFactorScore[];
  verifiedMonthlyRevenue: number;
  verifiedOperatingExpenses: number;
  monthlyFreeCashFlow: number;
  existingObligations: number;
  availableRepaymentCapacity: number;
  indicativeLoanAmount: number | null;
  indicativeLoanRange: { min: number; max: number } | null;
  estimatedMonthlyEmi: number | null;
  assumptions: {
    affordabilityRatio: number;
    interestRateAnnualPct: number;
    repaymentTermMonths: number;
  };
  positiveFactors: string[];
  riskFactors: string[];
  dataCompletenessPct: number;
  sourceDocumentIds: string[];
  isDemo: boolean;
}

export type SimulationScenarioType = 'revenue_shock' | 'collection_shock' | 'expense_shock';

export interface SimulationConfig {
  scenarioType: SimulationScenarioType;
  shockPercent: number;
  scaleVariableCostsWithRevenue: boolean;
}

export interface SimulationResult {
  simulationId: string;
  scenarioType: SimulationScenarioType;
  scenarioLabel: string;
  shockPercent: number;
  simulated: true;
  createdAt: string;
  baselineRevenue: number;
  simulatedRevenue: number;
  revenueDelta: number;
  baselineExpenses: number;
  simulatedExpenses: number;
  baselineSurplus: number;
  simulatedSurplus: number;
  cashFlowImpact: number;
  baselineLoanCapacity: number;
  simulatedLoanCapacity: number;
  loanCapacityDelta: number;
  dscrBaseline: number;
  dscrSimulated: number;
  impactedNodeIds: string[];
  impactedEdgeIds: string[];
  assumptionsUsed: string[];
  isDemo: boolean;
}

export interface InvestigatorToolTrace {
  toolName: string;
  arguments: Record<string, unknown>;
  resultSummary: string;
}

export interface InvestigationCardResponse {
  id: string;
  query: string;
  timestamp: string;
  modelUsed: string;
  thinkingMode: boolean;
  searchGrounded: boolean;
  summary: string;
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high';
  verifiedFacts: string[];
  assumptionsAndGaps: string[];
  citedDocumentIds: string[];
  citedRecordIds: string[];
  highlightedNodeIds: string[];
  toolTraces: InvestigatorToolTrace[];
  groundingSources?: { title: string; uri: string }[];
  recommendations: string[];
}

export interface AuditEventItem {
  id: string;
  userId: string;
  timestamp: string;
  sourceCategory: 'ai_generated' | 'user_modification' | 'hypothetical_simulation' | 'system_ingestion';
  eventType: string;
  affectedRecord: string;
  actionResult: string;
  detail: string;
  persistedInFirestore?: boolean;
}
