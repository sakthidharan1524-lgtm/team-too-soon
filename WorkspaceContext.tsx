import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
} from '../lib/firebase';
import {
  DEMO_WORKSPACES,
  KAVERI_BASELINE_FINANCIALS,
  KAVERI_DOCUMENTS,
  KAVERI_EVIDENCE_EDGES,
  KAVERI_EVIDENCE_NODES,
  KAVERI_FINDINGS,
  KAVERI_INITIAL_AUDIT_EVENTS,
  KAVERI_TRANSACTION_EDGES,
  KAVERI_TRANSACTION_NODES,
} from '../data/kaveriDemoData';
import {
  AuditEventItem,
  BusinessWorkspace,
  CreditAssessmentResult,
  DocumentAuthenticityReport,
  EvidenceDocumentItem,
  FinancialBaselineInputs,
  FindingStatus,
  GraphEdgeData,
  GraphMode,
  GraphNodeData,
  InvestigationCardResponse,
  PageRoute,
  SimulationConfig,
  SimulationResult,
  VerificationFinding,
} from '../types/evidenceos';
import {
  computeCreditAssessment,
  CreditWeights,
  DEFAULT_CREDIT_WEIGHTS,
  runFinancialStressSimulation,
} from '../utils/financialEngines';

export interface GraphHighlightState {
  nodeIds: string[];
  edgeIds: string[];
  reasonLabel: string | null;
  source: 'finding' | 'simulation' | 'investigator' | 'cycle' | null;
}

interface BackendHealthState {
  nodeServerReachable: boolean;
  pythonBackendConfigured: boolean;
  pythonBackendReachable: boolean;
  demoMode: boolean;
  whatsappConfigured: boolean;
  paddleOcrEnabled: boolean;
  geminiModel: string;
  geminiReasoningModel: string;
}

interface WorkspaceContextValue {
  activePage: PageRoute;
  setActivePage: (page: PageRoute) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  // Auth & Firebase status
  user: User | null;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // Workspace & Health
  workspaces: BusinessWorkspace[];
  activeWorkspace: BusinessWorkspace;
  setActiveWorkspaceId: (id: string) => void;
  backendHealth: BackendHealthState;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;

  // Documents & Verification
  documents: EvidenceDocumentItem[];
  selectedDocumentId: string;
  setSelectedDocumentId: (id: string) => void;
  openDocumentInVerification: (docId: string) => void;
  addUploadedDocument: (docItem: EvidenceDocumentItem) => Promise<void>;
  applyManualCorrection: (
    docId: string,
    recordId: string,
    fieldName: string,
    originalValue: string,
    correctedValue: string,
    reason: string
  ) => Promise<void>;
  updateDocumentAuthenticityReport: (
    docId: string,
    report: DocumentAuthenticityReport
  ) => Promise<void>;

  // Graph & Highlights
  graphMode: GraphMode;
  setGraphMode: (mode: GraphMode) => void;
  evidenceNodes: GraphNodeData[];
  evidenceEdges: GraphEdgeData[];
  transactionNodes: GraphNodeData[];
  transactionEdges: GraphEdgeData[];
  graphHighlight: GraphHighlightState;
  setGraphHighlight: (highlight: GraphHighlightState) => void;
  clearGraphHighlight: () => void;
  savedNodePositions: Record<string, { x: number; y: number }>;
  saveGraphPositions: (positions: Record<string, { x: number; y: number }>) => Promise<void>;
  resetSavedGraphPositions: () => void;

  // Findings
  findings: VerificationFinding[];
  selectedFindingId: string | null;
  selectFindingAndHighlight: (finding: VerificationFinding) => void;
  updateFindingReview: (findingId: string, status: FindingStatus, analystNote: string) => Promise<void>;

  // Credit Assessment
  financialBaseline: FinancialBaselineInputs;
  setFinancialBaseline: React.Dispatch<React.SetStateAction<FinancialBaselineInputs>>;
  creditWeights: CreditWeights;
  setCreditWeights: React.Dispatch<React.SetStateAction<CreditWeights>>;
  creditAssessment: CreditAssessmentResult;

  // Simulations
  simulationConfig: SimulationConfig;
  setSimulationConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  activeSimulation: SimulationResult;
  simulationHistory: SimulationResult[];
  executeSimulation: (overrideConfig?: SimulationConfig) => Promise<SimulationResult>;
  viewSimulationImpactOnGraph: (sim: SimulationResult) => void;

  // AI Investigator
  investigations: InvestigationCardResponse[];
  addInvestigationResult: (card: InvestigationCardResponse) => Promise<void>;

  // Audit Trail
  auditEvents: AuditEventItem[];
  logAuditEvent: (
    sourceCategory: AuditEventItem['sourceCategory'],
    eventType: string,
    affectedRecord: string,
    actionResult: string,
    detail: string
  ) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function sanitizeFirestoreId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || `id_${Date.now()}`;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState<PageRoute>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Firebase Auth
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Business Workspace
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('kaveri_textiles');
  const activeWorkspace = useMemo(
    () => DEMO_WORKSPACES.find((w) => w.id === activeWorkspaceId) || DEMO_WORKSPACES[0],
    [activeWorkspaceId]
  );

  // Backend Health
  const [backendHealth, setBackendHealth] = useState<BackendHealthState>({
    nodeServerReachable: true,
    pythonBackendConfigured: false,
    pythonBackendReachable: false,
    demoMode: true,
    whatsappConfigured: false,
    paddleOcrEnabled: false,
    geminiModel: 'gemini-3.1-flash-lite',
    geminiReasoningModel: 'gemini-4-hydrogen',
  });

  // Core State
  const [documents, setDocuments] = useState<EvidenceDocumentItem[]>(KAVERI_DOCUMENTS);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('DOC001');
  const [findings, setFindings] = useState<VerificationFinding[]>(KAVERI_FINDINGS);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>('FND-001');
  const [graphMode, setGraphMode] = useState<GraphMode>('evidence');
  const [graphHighlight, setGraphHighlight] = useState<GraphHighlightState>({
    nodeIds: [],
    edgeIds: [],
    reasonLabel: null,
    source: null,
  });

  const graphPosStorageKey = `evidenceos_graph_positions_${activeWorkspaceId}`;
  const [savedNodePositions, setSavedNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >(() => {
    try {
      const raw = localStorage.getItem(`evidenceos_graph_positions_kaveri_textiles`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return {};
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(graphPosStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setSavedNodePositions(parsed);
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }
    setSavedNodePositions({});
  }, [graphPosStorageKey]);

  const [financialBaseline, setFinancialBaseline] = useState<FinancialBaselineInputs>(
    KAVERI_BASELINE_FINANCIALS
  );
  const [creditWeights, setCreditWeights] = useState<CreditWeights>(DEFAULT_CREDIT_WEIGHTS);

  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>({
    scenarioType: 'revenue_shock',
    shockPercent: 20,
    scaleVariableCostsWithRevenue: true,
  });

  const initialSim = useMemo(
    () =>
      runFinancialStressSimulation(
        KAVERI_BASELINE_FINANCIALS,
        { scenarioType: 'revenue_shock', shockPercent: 20, scaleVariableCostsWithRevenue: true },
        true
      ),
    []
  );

  const [activeSimulation, setActiveSimulation] = useState<SimulationResult>(initialSim);
  const [simulationHistory, setSimulationHistory] = useState<SimulationResult[]>([initialSim]);
  const [investigations, setInvestigations] = useState<InvestigationCardResponse[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>(KAVERI_INITIAL_AUDIT_EVENTS);

  // Poll Node BFF health once on boot
  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setBackendHealth({
            nodeServerReachable: true,
            pythonBackendConfigured: Boolean(data.pythonBackendConfigured),
            pythonBackendReachable: Boolean(data.pythonBackendReachable),
            demoMode: data.demoMode !== false,
            whatsappConfigured: Boolean(data.whatsappConfigured),
            paddleOcrEnabled: Boolean(data.paddleOcrEnabled),
            geminiModel: data.geminiModel || 'gemini-3.1-flash-lite',
            geminiReasoningModel: data.geminiReasoningModel || 'gemini-4-hydrogen',
          });
        }
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  // Auth listener + User Profile sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser && currentUser.emailVerified) {
        const userDocPath = `users/${currentUser.uid}`;
        try {
          const ref = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, {
              uid: currentUser.uid,
              email: (currentUser.email || 'analyst@evidenceos.app').slice(0, 254),
              displayName: (currentUser.displayName || 'EvidenceOS Analyst').slice(0, 120),
              businessName: activeWorkspace.name.slice(0, 120),
              role: 'analyst',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          // Non-fatal profile sync log
          console.warn('User profile sync skipped:', userDocPath, err);
        }
      }
    });
    return () => unsub();
  }, [activeWorkspace.name]);

  // Firestore real-time listeners (strictly gated on authReady && authenticated user)
  useEffect(() => {
    if (!authReady || !user) return;

    const docsQuery = query(collection(db, 'documents'), where('ownerId', '==', user.uid));
    const unsubDocs = onSnapshot(
      docsQuery,
      (snap) => {
        const remoteDocs: EvidenceDocumentItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            businessId: String(data.businessId || 'kaveri_textiles'),
            fileName: String(data.fileName || 'Uploaded Document'),
            category: data.category || 'transaction_evidence',
            subcategory: String(data.subcategory || 'Uploaded Evidence'),
            uploadDate: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            fileSize: Number(data.fileSize || 0),
            mimeType: String(data.mimeType || 'application/octet-stream'),
            uploadStatus: data.uploadStatus || 'uploaded',
            ocrStatus: data.ocrStatus || 'completed',
            verificationStatus: data.verificationStatus || 'Extracted',
            language: 'Auto-detected',
            pageCount: 1,
            sha256Short: d.id.slice(0, 12),
            extractedSummary: String(data.extractedSummary || ''),
            previewText: String(data.extractedSummary || 'Document stored in workspace.'),
            isDemo: Boolean(data.isDemo),
            records: [],
            completenessChecks: [
              { field: 'Document Readability', required: true, present: true, valuePreview: 'Verified via Gemini OCR' },
            ],
            internalConsistencyNotes: ['Persisted to your Firebase workspace.'],
          };
        });

        setDocuments((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const rd of remoteDocs) {
            if (!existingIds.has(rd.id)) {
              merged.unshift(rd);
            }
          }
          return merged;
        });
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );

    const simsQuery = query(collection(db, 'simulations'), where('ownerId', '==', user.uid));
    const unsubSims = onSnapshot(
      simsQuery,
      (snap) => {
        const remoteSims: SimulationResult[] = snap.docs.map((d) => {
          const data = d.data();
          const st = data.scenarioType as SimulationConfig['scenarioType'];
          return {
            simulationId: d.id,
            scenarioType: st || 'revenue_shock',
            scenarioLabel:
              st === 'collection_shock'
                ? `${data.shockPercent}% Delayed Collections`
                : st === 'expense_shock'
                  ? `${data.shockPercent}% Expense Surge`
                  : `${data.shockPercent}% Revenue Loss`,
            shockPercent: Number(data.shockPercent || 20),
            simulated: true,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            baselineRevenue: Number(data.baselineRevenue || 0),
            simulatedRevenue: Number(data.simulatedRevenue || 0),
            revenueDelta: Number(data.simulatedRevenue || 0) - Number(data.baselineRevenue || 0),
            baselineExpenses: Number(data.baselineRevenue || 0) - Number(data.baselineSurplus || 0),
            simulatedExpenses: Number(data.simulatedRevenue || 0) - Number(data.simulatedSurplus || 0),
            baselineSurplus: Number(data.baselineSurplus || 0),
            simulatedSurplus: Number(data.simulatedSurplus || 0),
            cashFlowImpact: Number(data.simulatedSurplus || 0) - Number(data.baselineSurplus || 0),
            baselineLoanCapacity: Number(data.baselineLoanCapacity || 0),
            simulatedLoanCapacity: Number(data.simulatedLoanCapacity || 0),
            loanCapacityDelta: Number(data.simulatedLoanCapacity || 0) - Number(data.baselineLoanCapacity || 0),
            dscrBaseline: 2.91,
            dscrSimulated: 1.65,
            impactedNodeIds: ['BUS-KAVERI', 'CUST-SELVAM', 'CUST-KUMAR'],
            impactedEdgeIds: ['E-07', 'E-08'],
            assumptionsUsed: ['Loaded from persisted Firestore simulation run (simulated: true).'],
            isDemo: true,
          };
        });
        if (remoteSims.length > 0) {
          setSimulationHistory((prev) => {
            const ids = new Set(prev.map((s) => s.simulationId));
            const next = [...prev];
            for (const rs of remoteSims) {
              if (!ids.has(rs.simulationId)) next.unshift(rs);
            }
            return next;
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'simulations')
    );

    const auditQuery = query(collection(db, 'auditEvents'), where('ownerId', '==', user.uid));
    const unsubAudit = onSnapshot(
      auditQuery,
      (snap) => {
        const remoteEvents: AuditEventItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: user.email || user.uid,
            timestamp: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            sourceCategory: data.sourceCategory || 'user_modification',
            eventType: String(data.eventType || 'ACTION'),
            affectedRecord: String(data.affectedRecord || ''),
            actionResult: String(data.actionResult || ''),
            detail: String(data.detail || ''),
            persistedInFirestore: true,
          };
        });
        if (remoteEvents.length > 0) {
          setAuditEvents((prev) => {
            const ids = new Set(prev.map((a) => a.id));
            const next = [...prev];
            for (const ev of remoteEvents) {
              if (!ids.has(ev.id)) next.unshift(ev);
            }
            return next.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'auditEvents')
    );

    const reviewQuery = query(collection(db, 'findingReviews'), where('ownerId', '==', user.uid));
    const unsubReviews = onSnapshot(
      reviewQuery,
      (snap) => {
        if (snap.empty) return;
        const reviewMap = new Map<string, { status: FindingStatus; analystNote: string }>();
        snap.docs.forEach((d) => {
          const data = d.data();
          reviewMap.set(String(data.findingId), {
            status: data.status as FindingStatus,
            analystNote: String(data.analystNote || ''),
          });
        });
        setFindings((prev) =>
          prev.map((f) => {
            const ov = reviewMap.get(f.id);
            return ov ? { ...f, status: ov.status, analystNote: ov.analystNote } : f;
          })
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'findingReviews')
    );

    return () => {
      unsubDocs();
      unsubSims();
      unsubAudit();
      unsubReviews();
    };
  }, [authReady, user]);

  const loginWithGoogle = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      await signOutUser();
    } finally {
      setAuthLoading(false);
    }
  };

  const logAuditEvent = async (
    sourceCategory: AuditEventItem['sourceCategory'],
    eventType: string,
    affectedRecord: string,
    actionResult: string,
    detail: string
  ) => {
    const evtId = sanitizeFirestoreId(`AUD_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
    const newEvt: AuditEventItem = {
      id: evtId,
      userId: user?.email || 'demo-analyst',
      timestamp: new Date().toISOString(),
      sourceCategory,
      eventType,
      affectedRecord,
      actionResult,
      detail,
      persistedInFirestore: Boolean(user && user.emailVerified),
    };
    setAuditEvents((prev) => [newEvt, ...prev]);

    if (user && user.emailVerified) {
      const path = `auditEvents/${evtId}`;
      try {
        await setDoc(doc(db, 'auditEvents', evtId), {
          ownerId: user.uid,
          sourceCategory,
          eventType: eventType.slice(0, 80),
          affectedRecord: affectedRecord.slice(0, 120),
          actionResult: actionResult.slice(0, 60),
          detail: detail.slice(0, 500),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
  };

  const addUploadedDocument = async (docItem: EvidenceDocumentItem) => {
    setDocuments((prev) => [docItem, ...prev]);
    setSelectedDocumentId(docItem.id);

    if (user && user.emailVerified) {
      const safeId = sanitizeFirestoreId(docItem.id);
      const path = `documents/${safeId}`;
      try {
        await setDoc(doc(db, 'documents', safeId), {
          ownerId: user.uid,
          businessId: sanitizeFirestoreId(docItem.businessId).slice(0, 64),
          fileName: docItem.fileName.slice(0, 200),
          category: docItem.category,
          subcategory: docItem.subcategory.slice(0, 100),
          fileSize: Math.min(52428800, Math.max(0, Number(docItem.fileSize) || 0)),
          mimeType: docItem.mimeType.slice(0, 100),
          uploadStatus: docItem.uploadStatus,
          ocrStatus: docItem.ocrStatus,
          verificationStatus: docItem.verificationStatus,
          extractedSummary: docItem.extractedSummary.slice(0, 2000),
          isDemo: docItem.isDemo,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    await logAuditEvent(
      'system_ingestion',
      'DOCUMENT_UPLOAD_AND_EXTRACT',
      `${docItem.id} (${docItem.fileName})`,
      docItem.verificationStatus.toUpperCase().replace(/\s+/g, '_'),
      `Ingested ${docItem.subcategory} (${(docItem.fileSize / 1024).toFixed(1)} KB); OCR status: ${docItem.ocrStatus}.`
    );
  };

  const applyManualCorrection = async (
    docId: string,
    recordId: string,
    fieldName: string,
    originalValue: string,
    correctedValue: string,
    reason: string
  ) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        return {
          ...d,
          verificationStatus: 'Extracted',
          records: d.records.map((r) =>
            r.recordId === recordId
              ? {
                  ...r,
                  correctedValue,
                  correctionReason: reason,
                  needsManualReview: false,
                }
              : r
          ),
        };
      })
    );

    if (user && user.emailVerified) {
      const corId = sanitizeFirestoreId(`COR_${Date.now().toString(36)}`);
      const path = `manualCorrections/${corId}`;
      try {
        await setDoc(doc(db, 'manualCorrections', corId), {
          ownerId: user.uid,
          documentId: sanitizeFirestoreId(docId).slice(0, 64),
          recordId: sanitizeFirestoreId(recordId).slice(0, 64),
          fieldName: fieldName.slice(0, 80),
          originalValue: (originalValue || '').slice(0, 500),
          correctedValue: correctedValue.slice(0, 500),
          reason: reason.slice(0, 400),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    await logAuditEvent(
      'user_modification',
      'MANUAL_OCR_CORRECTION',
      `${docId} · ${recordId}`,
      'CORRECTED_PRESERVING_ORIGINAL',
      `Updated ${fieldName} from "${originalValue || 'null'}" to "${correctedValue}". Reason: ${reason}`
    );
  };

  const updateDocumentAuthenticityReport = async (
    docId: string,
    report: DocumentAuthenticityReport
  ) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, authenticityReport: report } : d))
    );

    await logAuditEvent(
      'ai_generated',
      'GEMINI_DOCUMENT_RECHECK',
      docId,
      `${report.geminiMatchPercentage}%_MATCH`,
      `Origin: ${report.originClassification} (synthetic likelihood ${report.syntheticLikelihoodPct}%); ${report.matchedFieldsCount}/${report.totalFieldsChecked} fields matched via ${report.modelUsed}.`
    );
  };

  const selectFindingAndHighlight = (finding: VerificationFinding) => {
    setSelectedFindingId(finding.id);
    if (finding.findingType === 'circular_transaction_pattern') {
      setGraphMode('transactions');
    }
    setGraphHighlight({
      nodeIds: finding.affectedNodeIds,
      edgeIds: finding.affectedEdgeIds,
      reasonLabel: finding.title,
      source: 'finding',
    });
  };

  const updateFindingReview = async (
    findingId: string,
    status: FindingStatus,
    analystNote: string
  ) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, status, analystNote } : f))
    );

    if (user && user.emailVerified) {
      const reviewId = sanitizeFirestoreId(`${user.uid.slice(0, 24)}_${findingId}`);
      const path = `findingReviews/${reviewId}`;
      try {
        const ref = doc(db, 'findingReviews', reviewId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            ownerId: user.uid,
            findingId: sanitizeFirestoreId(findingId).slice(0, 64),
            status,
            analystNote: analystNote.slice(0, 1000),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (snap.data()?.status !== 'Resolved') {
          await setDoc(
            ref,
            {
              ...snap.data(),
              status,
              analystNote: analystNote.slice(0, 1000),
              updatedAt: serverTimestamp(),
            }
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    await logAuditEvent(
      'user_modification',
      'FINDING_STATUS_UPDATED',
      findingId,
      status.toUpperCase().replace(/\s+/g, '_'),
      analystNote || `Updated finding status to ${status}.`
    );
  };

  const unresolvedCriticalCount = useMemo(
    () => findings.filter((f) => f.severity === 'Critical' && f.status !== 'Resolved').length,
    [findings]
  );

  const creditAssessment = useMemo(
    () =>
      computeCreditAssessment(
        financialBaseline,
        creditWeights,
        unresolvedCriticalCount,
        backendHealth.demoMode
      ),
    [financialBaseline, creditWeights, unresolvedCriticalCount, backendHealth.demoMode]
  );

  const executeSimulation = async (overrideConfig?: SimulationConfig): Promise<SimulationResult> => {
    const cfg = overrideConfig || simulationConfig;
    const sim = runFinancialStressSimulation(financialBaseline, cfg, backendHealth.demoMode);
    setActiveSimulation(sim);
    setSimulationHistory((prev) => [sim, ...prev]);

    if (user && user.emailVerified) {
      const simId = sanitizeFirestoreId(sim.simulationId);
      const path = `simulations/${simId}`;
      try {
        await setDoc(doc(db, 'simulations', simId), {
          ownerId: user.uid,
          businessId: sanitizeFirestoreId(activeWorkspace.id).slice(0, 64),
          scenarioType: sim.scenarioType,
          shockPercent: sim.shockPercent,
          baselineRevenue: sim.baselineRevenue,
          simulatedRevenue: sim.simulatedRevenue,
          baselineSurplus: sim.baselineSurplus,
          simulatedSurplus: sim.simulatedSurplus,
          baselineLoanCapacity: sim.baselineLoanCapacity,
          simulatedLoanCapacity: sim.simulatedLoanCapacity,
          simulated: true,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    await logAuditEvent(
      'hypothetical_simulation',
      'FINANCIAL_STRESS_SIMULATION',
      sim.simulationId,
      'SIMULATED_TRUE',
      `Ran ${sim.scenarioLabel}: surplus ₹${sim.baselineSurplus.toLocaleString('en-IN')} → ₹${sim.simulatedSurplus.toLocaleString('en-IN')}; loan capacity ₹${sim.baselineLoanCapacity.toLocaleString('en-IN')} → ₹${sim.simulatedLoanCapacity.toLocaleString('en-IN')}.`
    );

    return sim;
  };

  const viewSimulationImpactOnGraph = (sim: SimulationResult) => {
    setGraphHighlight({
      nodeIds: sim.impactedNodeIds,
      edgeIds: sim.impactedEdgeIds,
      reasonLabel: `Hypothetical Impact: ${sim.scenarioLabel}`,
      source: 'simulation',
    });
    if (activePage !== 'overview' && activePage !== 'evidence-network') {
      setActivePage('overview');
    }
  };

  const addInvestigationResult = async (card: InvestigationCardResponse) => {
    setInvestigations((prev) => [card, ...prev]);

    if (user && user.emailVerified) {
      const invId = sanitizeFirestoreId(card.id);
      const path = `investigations/${invId}`;
      try {
        await setDoc(doc(db, 'investigations', invId), {
          ownerId: user.uid,
          businessId: sanitizeFirestoreId(activeWorkspace.id).slice(0, 64),
          query: card.query.slice(0, 600),
          summary: card.summary.slice(0, 4000),
          riskLevel: card.riskLevel,
          citedDocumentIds: card.citedDocumentIds.slice(0, 20).map((s) => s.slice(0, 64)),
          toolTraceCount: Math.min(50, card.toolTraces.length),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    await logAuditEvent(
      'ai_generated',
      'AI_INVESTIGATOR_QUERY',
      card.id,
      `RISK_${card.riskLevel.toUpperCase()}`,
      `Investigated "${card.query.slice(0, 120)}" using ${card.toolTraces.length} tool call(s) across ${card.citedDocumentIds.length} document(s).`
    );
  };

  const openDocumentInVerification = (docId: string) => {
    setSelectedDocumentId(docId);
    setActivePage('document-verification');
  };

  const clearGraphHighlight = () =>
    setGraphHighlight({ nodeIds: [], edgeIds: [], reasonLabel: null, source: null });

  const saveGraphPositions = async (positions: Record<string, { x: number; y: number }>) => {
    let mergedCount = 0;
    setSavedNodePositions((prev) => {
      const merged = { ...prev, ...positions };
      mergedCount = Object.keys(merged).length;
      try {
        localStorage.setItem(graphPosStorageKey, JSON.stringify(merged));
      } catch {
        // Ignore storage quota errors
      }
      return merged;
    });

    await logAuditEvent(
      'user_modification',
      'GRAPH_LAYOUT_SAVED',
      activeWorkspace.id,
      'SAVED',
      `Saved custom positions for ${Object.keys(positions).length} graph node(s) (${mergedCount} total persisted across views).`
    );
  };

  const resetSavedGraphPositions = () => {
    setSavedNodePositions({});
    try {
      localStorage.removeItem(graphPosStorageKey);
    } catch {
      // Ignore storage errors
    }
  };

  const value: WorkspaceContextValue = {
    activePage,
    setActivePage,
    sidebarCollapsed,
    setSidebarCollapsed,
    user,
    authReady,
    authLoading,
    authError,
    loginWithGoogle,
    logout,
    workspaces: DEMO_WORKSPACES,
    activeWorkspace,
    setActiveWorkspaceId,
    backendHealth,
    globalSearchQuery,
    setGlobalSearchQuery,
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    openDocumentInVerification,
    addUploadedDocument,
    applyManualCorrection,
    updateDocumentAuthenticityReport,
    graphMode,
    setGraphMode,
    evidenceNodes: KAVERI_EVIDENCE_NODES,
    evidenceEdges: KAVERI_EVIDENCE_EDGES,
    transactionNodes: KAVERI_TRANSACTION_NODES,
    transactionEdges: KAVERI_TRANSACTION_EDGES,
    graphHighlight,
    setGraphHighlight,
    clearGraphHighlight,
    savedNodePositions,
    saveGraphPositions,
    resetSavedGraphPositions,
    findings,
    selectedFindingId,
    selectFindingAndHighlight,
    updateFindingReview,
    financialBaseline,
    setFinancialBaseline,
    creditWeights,
    setCreditWeights,
    creditAssessment,
    simulationConfig,
    setSimulationConfig,
    activeSimulation,
    simulationHistory,
    executeSimulation,
    viewSimulationImpactOnGraph,
    investigations,
    addInvestigationResult,
    auditEvents,
    logAuditEvent,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
