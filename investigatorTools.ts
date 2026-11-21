import { FunctionDeclaration, Type } from '@google/genai';
import {
  KAVERI_BASELINE_FINANCIALS,
  KAVERI_DOCUMENTS,
  KAVERI_EVIDENCE_EDGES,
  KAVERI_EVIDENCE_NODES,
  KAVERI_FINDINGS,
  KAVERI_TRANSACTION_EDGES,
  KAVERI_TRANSACTION_NODES,
} from '../../src/data/kaveriDemoData';
import {
  computeCreditAssessment,
  DEFAULT_CREDIT_WEIGHTS,
  detectDirectedCycles,
  runFinancialStressSimulation,
} from '../../src/utils/financialEngines';

/**
 * All 10 Investigator Function Calling tool declarations required by EvidenceOS spec.
 */
export const INVESTIGATOR_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'search_documents',
    description: 'Search uploaded business financial documents by keyword, category, or counterparty.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search keyword such as INV001, Kumar, SBI, SIDBI, ledger' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_document_details',
    description: 'Retrieve full metadata, completeness checklist, and preview text of a document by ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        document_id: { type: Type.STRING, description: 'Document ID e.g. DOC001, DOC002, DOC003, DOC004' },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_extracted_records',
    description: 'Retrieve structured OCR-extracted records for a document or across all documents.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        document_id: { type: Type.STRING, description: 'Optional document ID filter' },
      },
    },
  },
  {
    name: 'search_business_entities',
    description: 'Search businesses, customers, suppliers, invoices, and accounts in the knowledge graph.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Entity name or ID e.g. Kumar, Cauvery, Kaveri' },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_matching_transactions',
    description: 'Find bank or ledger financial transactions matching a counterparty, invoice reference, or amount.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        counterparty_or_ref: { type: Type.STRING, description: 'Counterparty name, invoice ID, or transaction ID' },
      },
      required: ['counterparty_or_ref'],
    },
  },
  {
    name: 'detect_transaction_cycles',
    description: 'Run directed cycle detection on the Payer->Receiver financial transaction graph.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_length: { type: Type.INTEGER, description: 'Maximum cycle hop count (default 4)' },
      },
    },
  },
  {
    name: 'get_verification_findings',
    description: 'Retrieve all deterministic verification findings, discrepancies, and evidence alerts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        severity: { type: Type.STRING, description: 'Optional filter: Critical, Warning, Information, or all' },
      },
    },
  },
  {
    name: 'get_evidence_relationships',
    description: 'Inspect provenance relationships connected to an entity or document node in the Evidence Knowledge Graph.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        entity_id: { type: Type.STRING, description: 'Node ID e.g. INV-001, CUST-KUMAR, BUS-KAVERI' },
      },
      required: ['entity_id'],
    },
  },
  {
    name: 'run_financial_simulation',
    description: 'Execute a deterministic hypothetical financial stress test (revenue_shock, collection_shock, or expense_shock).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        scenario_type: {
          type: Type.STRING,
          description: 'One of revenue_shock, collection_shock, expense_shock',
        },
        shock_percent: {
          type: Type.NUMBER,
          description: 'Shock percentage between 0 and 60 (default 20)',
        },
      },
      required: ['scenario_type', 'shock_percent'],
    },
  },
  {
    name: 'get_loan_assessment',
    description: 'Retrieve the deterministic EvidenceOS Financial Readiness Score (0-100) and indicative loan capacity proof.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        include_factors: { type: Type.BOOLEAN, description: 'Include detailed 6-factor breakdown' },
      },
    },
  },
];

export function executeInvestigatorTool(
  toolName: string,
  args: Record<string, unknown>
): { data: unknown; summary: string; citedDocs: string[]; citedNodes: string[] } {
  const citedDocs: string[] = [];
  const citedNodes: string[] = [];

  switch (toolName) {
    case 'search_documents': {
      const q = String(args.query || '').toLowerCase();
      const matches = KAVERI_DOCUMENTS.filter(
        (d) =>
          !q ||
          d.fileName.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.extractedSummary.toLowerCase().includes(q) ||
          d.previewText.toLowerCase().includes(q)
      ).map((d) => {
        citedDocs.push(d.id);
        return {
          id: d.id,
          fileName: d.fileName,
          category: d.subcategory,
          verificationStatus: d.verificationStatus,
          summary: d.extractedSummary,
        };
      });
      return {
        data: { count: matches.length, documents: matches },
        summary: `Found ${matches.length} document(s) matching "${args.query || '*'}".`,
        citedDocs,
        citedNodes,
      };
    }

    case 'get_document_details': {
      const docId = String(args.document_id || '').toUpperCase();
      const docItem = KAVERI_DOCUMENTS.find((d) => d.id.toUpperCase() === docId);
      if (!docItem) {
        return { data: { error: `Document ${docId} not found.` }, summary: `Document ${docId} not found.`, citedDocs, citedNodes };
      }
      citedDocs.push(docItem.id);
      return {
        data: {
          id: docItem.id,
          fileName: docItem.fileName,
          verificationStatus: docItem.verificationStatus,
          summary: docItem.extractedSummary,
          completenessChecks: docItem.completenessChecks,
          consistencyNotes: docItem.internalConsistencyNotes,
          records: docItem.records,
        },
        summary: `Retrieved ${docItem.id} (${docItem.fileName}) — status: ${docItem.verificationStatus}.`,
        citedDocs,
        citedNodes,
      };
    }

    case 'get_extracted_records': {
      const docId = args.document_id ? String(args.document_id).toUpperCase() : null;
      const records = KAVERI_DOCUMENTS.filter((d) => !docId || d.id.toUpperCase() === docId).flatMap(
        (d) => {
          citedDocs.push(d.id);
          return d.records;
        }
      );
      return {
        data: { count: records.length, records },
        summary: `Retrieved ${records.length} extracted record(s).`,
        citedDocs,
        citedNodes,
      };
    }

    case 'search_business_entities': {
      const q = String(args.query || '').toLowerCase();
      const matches = KAVERI_EVIDENCE_NODES.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.identifier.toLowerCase().includes(q)
      );
      matches.forEach((m) => {
        citedNodes.push(m.id);
        if (m.sourceDocumentId) citedDocs.push(m.sourceDocumentId);
      });
      return {
        data: { count: matches.length, entities: matches },
        summary: `Matched ${matches.length} entity node(s) for "${args.query}".`,
        citedDocs,
        citedNodes,
      };
    }

    case 'find_matching_transactions': {
      const q = String(args.counterparty_or_ref || '').toLowerCase();
      const matches = KAVERI_TRANSACTION_EDGES.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      );
      matches.forEach((m) => {
        citedDocs.push(m.sourceDocumentId);
        citedNodes.push(m.source, m.target);
      });
      return {
        data: { count: matches.length, transactions: matches },
        summary: `Located ${matches.length} transaction edge(s) matching "${args.counterparty_or_ref}".`,
        citedDocs,
        citedNodes,
      };
    }

    case 'detect_transaction_cycles': {
      const maxLen = Math.min(6, Math.max(2, Number(args.max_length) || 4));
      const cycles = detectDirectedCycles(KAVERI_TRANSACTION_EDGES, maxLen);
      const cycleEdges = KAVERI_TRANSACTION_EDGES.filter((e) => e.isCycleEdge);
      cycleEdges.forEach((e) => {
        citedDocs.push(e.sourceDocumentId);
        citedNodes.push(e.source, e.target);
      });
      return {
        data: {
          cycleCount: cycles.length,
          cycles: cycles.map((c) => ({
            nodeIds: c,
            labels: c.map((id) => KAVERI_TRANSACTION_NODES.find((n) => n.id === id)?.label || id),
          })),
          supportingEdges: cycleEdges,
          note: 'Circular transactions are investigation signals, not proof of fraud.',
        },
        summary: `Detected ${cycles.length} directed cycle(s) within max length ${maxLen}.`,
        citedDocs,
        citedNodes,
      };
    }

    case 'get_verification_findings': {
      const sev = String(args.severity || 'all');
      const items = KAVERI_FINDINGS.filter(
        (f) => sev === 'all' || f.severity.toLowerCase() === sev.toLowerCase()
      );
      items.forEach((f) => {
        citedDocs.push(...f.sourceDocumentIds);
        citedNodes.push(...f.affectedNodeIds);
      });
      return {
        data: { count: items.length, findings: items },
        summary: `Retrieved ${items.length} verification finding(s).`,
        citedDocs,
        citedNodes,
      };
    }

    case 'get_evidence_relationships': {
      const entityId = String(args.entity_id || '').toUpperCase();
      const edges = KAVERI_EVIDENCE_EDGES.filter(
        (e) =>
          e.source.toUpperCase().includes(entityId) || e.target.toUpperCase().includes(entityId)
      );
      edges.forEach((e) => {
        citedDocs.push(e.sourceDocumentId);
        citedNodes.push(e.source, e.target);
      });
      return {
        data: { entityId, edgeCount: edges.length, edges },
        summary: `Retrieved ${edges.length} evidence relationship(s) linked to ${entityId}.`,
        citedDocs,
        citedNodes,
      };
    }

    case 'run_financial_simulation': {
      const scenarioType =
        args.scenario_type === 'collection_shock' || args.scenario_type === 'expense_shock'
          ? args.scenario_type
          : 'revenue_shock';
      const shockPercent = Math.max(0, Math.min(60, Number(args.shock_percent ?? 20)));
      const sim = runFinancialStressSimulation(
        KAVERI_BASELINE_FINANCIALS,
        { scenarioType, shockPercent, scaleVariableCostsWithRevenue: true },
        true
      );
      citedNodes.push(...sim.impactedNodeIds);
      citedDocs.push('DOC002', 'DOC005', 'DOC006');
      return {
        data: sim,
        summary: `Simulated ${sim.scenarioLabel}: surplus ₹${sim.baselineSurplus.toLocaleString('en-IN')} → ₹${sim.simulatedSurplus.toLocaleString('en-IN')}, loan capacity ₹${sim.baselineLoanCapacity.toLocaleString('en-IN')} → ₹${sim.simulatedLoanCapacity.toLocaleString('en-IN')}.`,
        citedDocs,
        citedNodes,
      };
    }

    case 'get_loan_assessment': {
      const assessment = computeCreditAssessment(
        KAVERI_BASELINE_FINANCIALS,
        DEFAULT_CREDIT_WEIGHTS,
        2,
        true
      );
      citedDocs.push(...assessment.sourceDocumentIds);
      citedNodes.push('BUS-KAVERI', 'DOC-PNL-26', 'DOC-LOAN-SIDBI', 'STMT-SBI-NOV');
      return {
        data: assessment,
        summary: `Readiness score ${assessment.overallScore}/100; indicative loan capacity ₹${(assessment.indicativeLoanAmount ?? 0).toLocaleString('en-IN')}.`,
        citedDocs,
        citedNodes,
      };
    }

    default:
      return {
        data: { error: `Unknown tool: ${toolName}` },
        summary: `Unknown tool ${toolName}`,
        citedDocs,
        citedNodes,
      };
  }
}
