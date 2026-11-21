# EvidenceOS
### Multimodal financial evidence intelligence for MSME credit assessment

EvidenceOS helps lenders and credit analysts investigate the financial evidence of micro, small, and medium enterprises (MSMEs). It brings business documents, extracted financial records, transaction relationships, verification findings, and scenario analysis into one review workspace.

**The central problem:** many small businesses have incomplete or fragmented financial records. A lender may receive bank statements, invoices, ledgers, receipts, loan documents, and business communications that are difficult to reconcile manually. EvidenceOS helps connect those records and surface what is supported, inconsistent, or still missing.

> **Evidence first. Credit insight second. Human decision always.**

EvidenceOS is a decision-support prototype. Its indicative readiness assessment is not a bureau credit score, a regulated lending decision, or a substitute for lender underwriting.

## Who is it for?

- **Primary users:** lenders, credit officers, and MSME underwriting teams.
- **Evidence providers:** MSME owners who submit business and financial records.
- **Purpose:** help lenders assess the consistency, traceability, and resilience of the evidence behind a potential credit decision.

## What EvidenceOS does

| Capability | Description |
|---|---|
| **Multimodal document intake** | Accepts financial evidence such as PDFs, images, text, and CSV-style records for extraction and analysis. |
| **AI-assisted extraction** | Uses Gemini to identify financial documents, extract structured records, preserve source text, and flag unreadable or uncertain fields for review. |
| **Evidence verification** | Organizes completeness, consistency, and verification findings so analysts can inspect missing or conflicting information. |
| **Evidence relationship graph** | Connects businesses, counterparties, documents, invoices, and other evidence entities. |
| **Transaction graph analysis** | Represents payer-to-receiver transactions and surfaces connected paths and potential circular flows for investigation. |
| **AI Investigator** | Uses Gemini function calling to query documents, extracted records, entities, transactions, findings, graph relationships, simulations, and credit assessments. |
| **Indicative credit readiness assessment** | Computes a deterministic financial-readiness assessment and indicative loan capacity from the available financial inputs. |
| **Repayment resilience simulator** | Runs hypothetical revenue, collection, and expense shocks to show how financial conditions may affect surplus and indicative loan capacity. |
| **Review and audit support** | Includes data structures for analyst reviews, manual extraction corrections, investigation records, simulation runs, and audit events. |

Automated findings are signals for review, not proof of fraud or misconduct. AI-extracted fields and authenticity indicators must be checked against original records.

## How the workflow operates

1. **Submit evidence** — The analyst uploads business documents or transaction records.
2. **Extract information** — Gemini processes supported files and returns structured fields, records, summaries, and uncertainty indicators.
3. **Inspect and verify** — The workflow surfaces document completeness, extraction issues, and potential inconsistencies.
4. **Connect records** — Evidence entities and financial transactions are represented as connected graph data.
5. **Investigate** — The AI Investigator can call purpose-built tools to retrieve records, trace relationships, inspect findings, and run analyses.
6. **Assess readiness** — Deterministic financial logic calculates an indicative readiness score and loan-capacity estimate from the supplied inputs.
7. **Stress-test assumptions** — Analysts can model revenue, collection, or expense shocks and compare baseline versus simulated outcomes.
8. **Review the evidence** — A lender uses the underlying records and findings as decision support. The system does not make the final lending decision.

## Technical architecture

The current repository contains a React/Vite application and a Node.js/Express backend-for-frontend (BFF). The BFF exposes the application API, invokes Gemini services, and can optionally proxy selected intelligence endpoints to an external Python FastAPI service.

| Layer | Technology / responsibility |
|---|---|
| Web application | React 19, TypeScript, Vite |
| UI and data visualization | Cytoscape.js for graph visualization; Recharts for charts; Tailwind CSS |
| API / BFF | Node.js, Express, TypeScript, `tsx` |
| AI integration | Google Gemini SDK (`@google/genai`), server-side API calls, structured JSON responses, function calling |
| Document handling | Multer in-memory uploads; Gemini-based multimodal extraction |
| Identity and data foundation | Firebase SDK and Firestore security-rule artifacts |
| Deterministic analysis | Financial calculation and stress-simulation modules; graph-cycle detection utilities |
| Optional external intelligence service | Python FastAPI backend, configurable through `PYTHON_BACKEND_URL` |
| Optional relational data layer | PostgreSQL connection configuration for the external Python service |

### AI Investigator tools

The Gemini function-calling layer exposes specialist tools for:

1. Searching documents
2. Retrieving document details
3. Retrieving extracted records
4. Searching business entities
5. Finding matching transactions
6. Detecting transaction cycles
7. Retrieving verification findings
8. Inspecting evidence relationships
9. Running financial stress simulations
10. Retrieving the indicative loan assessment

The model selects tools to investigate a question; application code executes the corresponding operations and returns structured results. Deterministic calculations are kept in application logic rather than delegated to free-form model arithmetic.

### Graph analysis

EvidenceOS distinguishes two related graph views:

- **Evidence knowledge graph:** represents provenance and relationships among businesses, entities, documents, and records.
- **Financial transaction graph:** represents directed payer-to-receiver transfers and supports bounded cycle detection.

A detected cycle or unusual relationship is an investigation lead. It is not, by itself, evidence of fraud.

## Demo mode and external services

The Node.js BFF supports a demonstration fallback when the optional Python backend is not configured or cannot be reached. In that mode, selected endpoints return the bundled Kaveri demonstration dataset and deterministic demo calculations.

The health endpoint reports whether the Python backend is configured and reachable, whether demo mode is active, and which Gemini models are configured.

**Important distinctions:**

- Demo records are illustrative and must not be represented as real customer or bank data.
- `PYTHON_BACKEND_URL` is optional. The Python FastAPI service is an external integration point; it is not installed by the root Node.js package.
- WhatsApp Business Platform webhook handling remains disabled until valid official Cloud API credentials are configured.
- PaddleOCR is optional and disabled by default in the example environment.
- A configured integration is not proof that the external service is deployed, reachable, or production-ready.

## API overview

The Node.js service exposes the following routes:

| Route | Purpose |
|---|---|
| `GET /health` and `GET /api/health` | Service and integration status |
| `GET /api/v1/documents` | List evidence documents |
| `GET /api/v1/documents/:documentId` | Retrieve a document |
| `POST /api/v1/documents/upload` | Upload a document using multipart form data |
| `POST /api/v1/documents/upload-base64` | Upload a base64-encoded document |
| `POST /api/v1/ocr/extract` | Run structured extraction |
| `POST /api/v1/ocr/recheck` | Recheck extraction/authenticity indicators |
| `GET /api/v1/graph/evidence` | Retrieve the evidence graph |
| `GET /api/v1/graph/transactions` | Retrieve the transaction graph |
| `POST /api/v1/graph/detect-cycles` | Detect bounded directed transaction cycles |
| `POST /api/v1/credit/assess` | Compute indicative credit readiness |
| `POST /api/v1/simulations/run` | Run a hypothetical financial stress test |
| `POST /api/v1/investigations/:investigationId/query` | Query the AI Investigator |
| `GET/POST /api/v1/integrations/whatsapp/webhook` | WhatsApp webhook endpoints (disabled until configured) |

The shared API contract for the optional Python service is documented in [openapi.yaml](./openapi.yaml).

## Getting started

### Prerequisites

- Node.js (LTS recommended)
- npm
- A Gemini API key for live AI extraction and investigation features

### 1. Clone the repository

```bash
git clone https://github.com/sakthidharan1524-lgtm/team-too-soon.git
cd team-too-soon
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Set your Gemini API key in `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_REASONING_MODEL=gemini-4-hydrogen
DEMO_MODE=true
PYTHON_BACKEND_URL=
BACKEND_SERVICE_TOKEN=
```

Keep secrets in your local environment. Never commit API keys, service tokens, credentials, or real financial records.

### 4. Start the application

```bash
npm run dev
```

The Express server starts on port `3000` and mounts the Vite development middleware. Open [http://localhost:3000](http://localhost:3000).

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Express server with Vite development middleware |
| `npm run start` | Start the server |
| `npm run build` | Build the frontend with Vite |
| `npm run preview` | Preview the Vite production build |
| `npm run lint` | Run the TypeScript no-emit check |

## Configuration reference

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Server-side Gemini API authentication |
| `GEMINI_MODEL` | Configurable extraction model |
| `GEMINI_REASONING_MODEL` | Configurable reasoning/video model |
| `APP_URL` | Hosted application URL |
| `PYTHON_BACKEND_URL` | Optional external FastAPI service base URL |
| `BACKEND_SERVICE_TOKEN` | Optional bearer token for the external service |
| `DEMO_MODE` | Enables demo fallback behavior unless explicitly set to `false` |
| `DATABASE_URL` | PostgreSQL URL for the optional Python service |
| `ENABLE_PADDLE_OCR` | Optional PaddleOCR integration flag |
| `WHATSAPP_ACCESS_TOKEN` | Official WhatsApp Cloud API access token |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook verification token |
| `WHATSAPP_APP_SECRET` | WhatsApp app secret for webhook integration |

## Responsible use and limitations

- EvidenceOS provides decision support, not autonomous loan approval or rejection.
- The indicative readiness score is a project-defined assessment, not an official bureau score or regulated credit rating.
- OCR and AI extraction can be wrong, especially with poor-quality scans, handwriting, or incomplete records.
- AI-generated/synthetic-document indicators are probabilistic signals, not forensic certification or legal proof.
- Circular transaction patterns and graph anomalies require contextual investigation; legitimate business activity can produce unusual-looking patterns.
- Stress-test outputs are hypothetical and depend on the assumptions and inputs supplied.
- Demo data must remain clearly labelled and separated from real customer data.
- Production lending use requires validation, security review, access controls, auditability, privacy safeguards, and independent testing.

## Project status

EvidenceOS is an evolving prototype. The repository contains the Node.js application integration, Gemini service layer, API routes, demo-mode logic, configuration artifacts, and supporting application modules. Optional external services and integrations must be configured and tested separately.

Do not assume a feature is production-ready solely because its interface or API route exists.

## Team

**Built by Team Too Soon.**
