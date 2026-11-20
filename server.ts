import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  KAVERI_BASELINE_FINANCIALS,
  KAVERI_DOCUMENTS,
  KAVERI_EVIDENCE_EDGES,
  KAVERI_EVIDENCE_NODES,
  KAVERI_FINDINGS,
  KAVERI_TRANSACTION_EDGES,
  KAVERI_TRANSACTION_NODES,
} from './src/data/kaveriDemoData';
import {
  computeCreditAssessment,
  DEFAULT_CREDIT_WEIGHTS,
  detectDirectedCycles,
  runFinancialStressSimulation,
} from './src/utils/financialEngines';
import {
  extractDocumentWithGemini,
  OCR_LITE_MODEL,
  REASONING_MODEL,
  recheckDocumentWithGemini,
  runInvestigatorAgent,
} from './server/services/geminiService';

const PORT = 3000;
const PYTHON_BACKEND_URL = (process.env.PYTHON_BACKEND_URL || '').trim();
const BACKEND_SERVICE_TOKEN = (process.env.BACKEND_SERVICE_TOKEN || '').trim();
const DEMO_MODE = process.env.DEMO_MODE !== 'false';
const WHATSAPP_CONFIGURED = Boolean(
  process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_VERIFY_TOKEN
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/**
 * Optional proxy helper: forwards to external Python FastAPI backend if PYTHON_BACKEND_URL is configured.
 * Returns null if unconfigured or unreachable so the Node BFF can transparently respond in Demo Mode.
 */
async function tryProxyPythonBackend(
  endpoint: string,
  method: string,
  body?: unknown
): Promise<{ status: number; data: unknown } | null> {
  if (!PYTHON_BACKEND_URL) return null;
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL.replace(/\/$/, '')}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(BACKEND_SERVICE_TOKEN ? { Authorization: `Bearer ${BACKEND_SERVICE_TOKEN}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    return { status: res.status, data };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // Health Endpoint (both /health and /api/health)
  const healthHandler = async (_req: express.Request, res: express.Response) => {
    const pyCheck = await tryProxyPythonBackend('/health', 'GET');
    res.json({
      status: 'ok',
      service: 'evidenceos-node-bff',
      demoMode: !pyCheck && DEMO_MODE,
      pythonBackendConfigured: Boolean(PYTHON_BACKEND_URL),
      pythonBackendReachable: Boolean(pyCheck && pyCheck.status === 200),
      whatsappConfigured: WHATSAPP_CONFIGURED,
      paddleOcrEnabled: process.env.ENABLE_PADDLE_OCR === 'true',
      geminiModel: OCR_LITE_MODEL,
      geminiReasoningModel: REASONING_MODEL,
      timestamp: new Date().toISOString(),
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Documents API
  app.get('/api/v1/documents', async (_req, res) => {
    const proxied = await tryProxyPythonBackend('/api/v1/documents', 'GET');
    if (proxied) return res.status(proxied.status).json(proxied.data);
    return res.json({ demoMode: true, documents: KAVERI_DOCUMENTS });
  });

  app.get('/api/v1/documents/:documentId', async (req, res) => {
    const proxied = await tryProxyPythonBackend(`/api/v1/documents/${req.params.documentId}`, 'GET');
    if (proxied) return res.status(proxied.status).json(proxied.data);
    const found = KAVERI_DOCUMENTS.find((d) => d.id === req.params.documentId);
    if (!found) return res.status(404).json({ error: 'Document not found' });
    return res.json({ demoMode: true, document: found });
  });

  const processUploadedBuffer = async (params: {
    fileBuffer: Buffer;
    originalName: string;
    mimeType: string;
    category: string;
  }) => {
    const documentId = `DOC-${Date.now().toString(36).toUpperCase()}`;
    const sha256Short = crypto
      .createHash('sha256')
      .update(params.fileBuffer)
      .digest('hex')
      .slice(0, 12);

    const isPlainText =
      params.mimeType.startsWith('text/') ||
      params.originalName.toLowerCase().endsWith('.txt') ||
      params.originalName.toLowerCase().endsWith('.csv');
    const textContent = isPlainText ? params.fileBuffer.toString('utf8') : undefined;

    const extraction = await extractDocumentWithGemini({
      documentId,
      fileName: params.originalName,
      category: params.category,
      mimeType: params.mimeType || 'application/octet-stream',
      fileBuffer: isPlainText ? undefined : params.fileBuffer,
      textContent,
    });

    return {
      documentId,
      sha256Short,
      isFinancialDocument: extraction.isFinancialDocument,
      ocrStatus: isPlainText ? 'not_applicable' : 'completed',
      verificationStatus: extraction.verificationStatus,
      language: extraction.language,
      pageCount: 1,
      modelUsed: extraction.modelUsed,
      summary: extraction.summary,
      extractedText: extraction.extractedText,
      consistencyNotes: extraction.consistencyNotes,
      records: extraction.records,
      authenticityReport: extraction.authenticityReport,
    };
  };

  app.post('/api/v1/documents/upload', (req, res) => {
    upload.single('file')(req, res, async (multerErr: any) => {
      if (multerErr) {
        const status = multerErr.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({
          error:
            multerErr.code === 'LIMIT_FILE_SIZE'
              ? 'File exceeds 20 MB server limit. Please compress or use a smaller image.'
              : multerErr.message || 'Invalid multipart upload request.',
        });
      }
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'No file attached to upload request.' });
        }
        const payload = await processUploadedBuffer({
          fileBuffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          category: String(req.body?.category || 'transaction_evidence'),
        });
        return res.json(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Document extraction failed.';
        return res.status(500).json({ error: message });
      }
    });
  });

  // Base64 JSON upload fallback (reliable through proxies that restrict large multipart streams)
  app.post('/api/v1/documents/upload-base64', async (req, res) => {
    try {
      const { fileName, mimeType, category, fileBase64 } = req.body || {};
      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({ error: 'Missing base64 file content.' });
      }
      const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const fileBuffer = Buffer.from(cleanBase64, 'base64');
      const payload = await processUploadedBuffer({
        fileBuffer,
        originalName: String(fileName || 'uploaded-file'),
        mimeType: String(mimeType || 'application/octet-stream'),
        category: String(category || 'transaction_evidence'),
      });
      return res.json(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Document extraction failed.';
      return res.status(500).json({ error: message });
    }
  });

  // OCR Re-extraction Endpoint
  app.post('/api/v1/ocr/extract', async (req, res) => {
    try {
      const { documentId, fileName, category, textContent } = req.body || {};
      const extraction = await extractDocumentWithGemini({
        documentId: String(documentId || 'DOC-ADHOC'),
        fileName: String(fileName || 'document.txt'),
        category: String(category || 'transaction_evidence'),
        mimeType: 'text/plain',
        textContent: String(textContent || ''),
      });
      return res.json(extraction);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR extraction failed.';
      return res.status(500).json({ error: message });
    }
  });

  // Independent Gemini Authenticity & Field-Match Recheck Endpoint (Free-tier Gemini)
  app.post('/api/v1/ocr/recheck', async (req, res) => {
    try {
      const {
        documentId,
        fileName,
        category,
        isDemo,
        textContent,
        imageDataUrl,
        existingRecords,
      } = req.body || {};
      const hasText = Boolean(textContent && String(textContent).trim());
      const hasImage = Boolean(imageDataUrl && String(imageDataUrl).startsWith('data:image/'));
      if (!hasText && !hasImage) {
        return res.status(400).json({
          error: 'Document text or image content is required to run Gemini authenticity and match recheck.',
        });
      }
      const report = await recheckDocumentWithGemini({
        documentId: String(documentId || 'DOC-ADHOC'),
        fileName: String(fileName || 'document.txt'),
        category: String(category || 'transaction_evidence'),
        isDemo: Boolean(isDemo),
        textContent: String(textContent || ''),
        imageDataUrl: hasImage ? String(imageDataUrl) : undefined,
        existingRecords: Array.isArray(existingRecords) ? existingRecords : [],
      });
      return res.json({ report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini document recheck failed.';
      return res.status(500).json({ error: message });
    }
  });

  // Verification Findings
  app.get('/api/v1/verification/findings', async (_req, res) => {
    const proxied = await tryProxyPythonBackend('/api/v1/verification/findings', 'GET');
    if (proxied) return res.status(proxied.status).json(proxied.data);
    return res.json({ demoMode: true, findings: KAVERI_FINDINGS });
  });

  app.post('/api/v1/verification/run', async (_req, res) => {
    const proxied = await tryProxyPythonBackend('/api/v1/verification/run', 'POST');
    if (proxied) return res.status(proxied.status).json(proxied.data);
    return res.json({
      demoMode: true,
      findingsCount: KAVERI_FINDINGS.length,
      findings: KAVERI_FINDINGS,
    });
  });

  // Graph Endpoints
  app.get('/api/v1/graph/evidence', async (_req, res) => {
    const proxied = await tryProxyPythonBackend('/api/v1/graph/evidence', 'GET');
    if (proxied) return res.status(proxied.status).json(proxied.data);
    return res.json({
      demoMode: true,
      graphType: 'evidence_knowledge_graph',
      nodes: KAVERI_EVIDENCE_NODES,
      edges: KAVERI_EVIDENCE_EDGES,
    });
  });

  app.get('/api/v1/graph/transactions', async (_req, res) => {
    const proxied = await tryProxyPythonBackend('/api/v1/graph/transactions', 'GET');
    if (proxied) return res.status(proxied.status).json(proxied.data);
    return res.json({
      demoMode: true,
      graphType: 'financial_transaction_graph',
      nodes: KAVERI_TRANSACTION_NODES,
      edges: KAVERI_TRANSACTION_EDGES,
    });
  });

  app.post('/api/v1/graph/detect-cycles', async (_req, res) => {
    const proxied = await tryProxyPythonBackend('/api/v1/graph/detect-cycles', 'POST');
    if (proxied) return res.status(proxied.status).json(proxied.data);
    const cycles = detectDirectedCycles(KAVERI_TRANSACTION_EDGES, 4);
    return res.json({
      demoMode: true,
      engine: 'EvidenceOS-CycleDetector (NetworkX-compatible)',
      cycleCount: cycles.length,
      cycles,
    });
  });

  // Credit Assessment Endpoint
  app.post('/api/v1/credit/assess', async (req, res) => {
    const proxied = await tryProxyPythonBackend('/api/v1/credit/assess', 'POST', req.body);
    if (proxied) return res.status(proxied.status).json(proxied.data);
    const inputs = { ...KAVERI_BASELINE_FINANCIALS, ...(req.body?.inputs || {}) };
    const result = computeCreditAssessment(inputs, DEFAULT_CREDIT_WEIGHTS, 2, true);
    return res.json({ demoMode: true, assessment: result });
  });

  // Financial Stress Simulation Endpoint
  app.post('/api/v1/simulations/run', async (req, res) => {
    const proxied = await tryProxyPythonBackend('/api/v1/simulations/run', 'POST', req.body);
    if (proxied) return res.status(proxied.status).json(proxied.data);
    const scenarioType = req.body?.scenarioType || 'revenue_shock';
    const shockPercent = Number(req.body?.shockPercent ?? 20);
    const scaleVariableCostsWithRevenue = req.body?.scaleVariableCostsWithRevenue !== false;
    const sim = runFinancialStressSimulation(
      KAVERI_BASELINE_FINANCIALS,
      { scenarioType, shockPercent, scaleVariableCostsWithRevenue },
      true
    );
    return res.json({ demoMode: true, simulation: sim });
  });

  // AI Investigator Agent Endpoint (Real Gemini SDK with Function Calling, High Thinking, Search Grounding)
  app.post('/api/v1/investigations/:investigationId/query', async (req, res) => {
    try {
      const queryText = String(req.body?.query || '').trim();
      if (!queryText) {
        return res.status(400).json({ error: 'Investigation query cannot be empty.' });
      }
      const mode =
        req.body?.mode === 'fast_lite' || req.body?.mode === 'search_grounded'
          ? req.body.mode
          : 'deep_thinking';

      const investigation = await runInvestigatorAgent({ query: queryText, mode });
      return res.json({ investigation });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI Investigator failed.';
      return res.status(500).json({ error: message });
    }
  });

  // WhatsApp Business Platform Cloud API Webhook (Disabled until credentials configured)
  app.get('/api/v1/integrations/whatsapp/webhook', (req, res) => {
    if (!WHATSAPP_CONFIGURED) {
      return res.status(503).json({
        configured: false,
        error: 'WhatsApp integration is disabled until WHATSAPP_VERIFY_TOKEN and WHATSAPP_ACCESS_TOKEN are configured.',
      });
    }
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  app.post('/api/v1/integrations/whatsapp/webhook', (_req, res) => {
    if (!WHATSAPP_CONFIGURED) {
      return res.status(503).json({
        configured: false,
        error: 'WhatsApp webhook ingestion is disabled until official Cloud API credentials are configured.',
      });
    }
    return res.status(200).json({ received: true, note: 'Plain-text routed directly; media routed to Gemini OCR.' });
  });

  // Vite dev middleware or static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EvidenceOS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
