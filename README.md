# EvidenceOS

**AI-assisted credit investigation and decision intelligence for MSME lending.**

EvidenceOS is a lender-facing platform that helps credit teams turn fragmented MSME financial records into structured evidence, investigate inconsistencies and relationships, and review explainable financial risk indicators before making a lending decision.

> **Important:** EvidenceOS is a decision-support system, not a credit bureau, a regulated credit score, or an autonomous loan-approval system. Its outputs require review by an authorized credit professional. Demo data and simulated results must not be treated as real borrower assessments.

## The problem

Small businesses may maintain financial information across bank statements, invoices, ledgers, GST-related records and other documents. Reviewing these sources independently makes it difficult to reconcile transactions, understand cash-flow behaviour and identify relationships that deserve further investigation.

EvidenceOS brings these activities into one investigation workflow for lenders.

## What the platform does

- **Document intelligence:** Uses the Gemini API to inspect supported uploads and extract structured financial information. The extraction workflow is designed to preserve source text and flag unreadable or uncertain fields for manual review.
- **Financial verification:** Compares financial records and surfaces discrepancies, duplicate or inconsistent entries for investigation. Financial checks should be deterministic wherever possible rather than delegated entirely to an LLM.
- **Evidence and transaction graphs:** Represents businesses, counterparties, documents and transactions as connected entities. Graph views help reviewers inspect relationships and potential circular transaction paths. A graph anomaly is an investigative signal, not proof of fraud.
- **AI-assisted investigation:** Provides an investigator workflow with Gemini-powered reasoning and tool execution for examining evidence and producing explanations.
- **Credit assessment:** Calculates internal credit-readiness indicators from structured financial inputs, with a focus on repayment behaviour, cash-flow stability, revenue consistency and debt obligations. This is not a CIBIL or other bureau score.
- **Credit Simulation Lab:** Runs scenario-based financial stress tests, such as revenue or expense shocks, and shows how the supplied assumptions affect calculated indicators. Simulation outputs are explicitly hypothetical.
- **Audit and reporting views:** Gives lenders a place to review findings, supporting records and investigation outputs.

## Architecture

The repository contains a React/TypeScript application, a Node.js/Express backend-for-frontend (BFF), and an optional Python/FastAPI processing service.

```text
React + TypeScript UI
        |
        v
Node.js + Express BFF
        |                 \
        |                  \----> Firebase services (configured in app)
        |
        +----> Gemini API (server-side document extraction and investigation)
        |
        +----> Optional Python FastAPI service
                    |
                    +--> OCR / PDF processing
                    +--> Deterministic financial verification
                    +--> NetworkX graph analysis
                    +--> Credit assessment
                    +--> Financial stress simulation
                    +--> Optional PostgreSQL persistence
```

The Node BFF can operate with local Kaveri demo data when the Python service is not configured and demo mode is enabled. Therefore, a running interface does not by itself mean that every workflow is operating on live borrower data or persisted production records.

### Main technologies

| Area | Technologies present in the repository |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Server / BFF | Node.js, Express, TypeScript, Multer |
| AI | Google Gemini API via `@google/genai` and `google-genai` |
| Graph processing | NetworkX in the Python service; Cytoscape.js for graph visualization |
| Charts | Recharts |
| Backend service | Python, FastAPI, Pydantic |
| Financial/data utilities | Python Decimal, RapidFuzz, PyMuPDF |
| Persistence layer | SQLAlchemy async models and PostgreSQL driver |
| App services | Firebase SDK |

Some integrations are optional or configuration-dependent. See the environment variables and setup notes below.

## Repository layout

The repository is organized around the following key areas (some modules may be nested under `src/` or `server/`):

- `src/` — frontend source, shared types, demo data and financial utilities.
- `server.ts` — Express BFF, API routes, upload handling and optional Python-service proxy.
- `server/services/geminiService.ts` — server-side Gemini extraction and investigation logic.
- `server/services/investigatorTools.ts` — investigator tool declarations and execution.
- `graphEngine.ts` / graph utilities — deterministic graph layout and graph-related frontend logic.
- `main.py`, `service.py`, `models.py` — Python FastAPI service, processing helpers and SQLAlchemy models.
- `requirements.txt` — Python service dependencies.
- `package.json` — JavaScript dependencies and scripts.
- `.env.example` — environment-variable template.
- `security_spec.md` — security design notes.
- `firestore.rules` — Firestore security rules.

## Getting started

### Prerequisites

- Node.js compatible with the versions required by the installed Vite and TypeScript packages.
- npm.
- A Gemini API key for Gemini-powered server features.
- Python 3.10+ if you intend to run the optional FastAPI service.
- PostgreSQL only if you configure and use the Python persistence layer.

### 1. Clone and install the application

```bash
git clone https://github.com/sakthidharan1524-lgtm/team-too-soon.git
cd team-too-soon
npm install
```

### 2. Configure environment variables

Create a local `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Set the values required for the features you intend to run:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Server-side Gemini API access. Required for Gemini-powered features. |
| `GEMINI_MODEL` | Optional model selection for document extraction. |
| `GEMINI_REASONING_MODEL` | Optional model selection for reasoning/investigation. |
| `PYTHON_BACKEND_URL` | Optional base URL of the external FastAPI service. Leave empty to use the Node BFF's configured fallback behaviour. |
| `BACKEND_SERVICE_TOKEN` | Optional bearer token sent by the Node BFF when proxying to the Python service. |
| `DEMO_MODE` | Demo-mode switch. The current Node server defaults to demo mode unless explicitly set to `false`. |
| `DATABASE_URL` | PostgreSQL connection string for the Python service. |
| `ENABLE_PADDLE_OCR` | Enables the optional PaddleOCR adapter only when the dependency and runtime support are installed. |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | Optional WhatsApp Business Platform integration credentials. |

Never commit real API keys, tokens, database credentials, borrower documents or other secrets.

### 3. Run the web application and BFF

```bash
npm run dev
```

The Express/Vite development server is configured in `server.ts` and listens on port `3000`.

Useful scripts:

```bash
npm run dev       # Start the Express + Vite development server
npm run build     # Build the Vite frontend
npm run preview   # Preview the built frontend
npm run lint      # Run TypeScript type-checking (tsc --noEmit)
```

### 4. Run the optional Python service

The Python service is optional. Configure its environment separately, install the root Python requirements, and run:

```bash
python -m venv .venv
```

Activate the virtual environment, then:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The FastAPI application exposes interactive API documentation at:

- `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

Set `PYTHON_BACKEND_URL=http://localhost:8000` in the Node application's environment to enable proxying to the Python service.

> The Python modules use the `app.*` package structure. Confirm that the package directories and configuration are present in your checkout before deploying the service. PostgreSQL models are defined, but database availability, schema creation/migrations and persistence wiring must be configured for an actual deployment.

## API overview

The Node BFF includes routes for health checks, document listing and upload, OCR extraction/recheck, and investigation-related workflows. The optional FastAPI service currently defines these routes:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Python service health and configuration status |
| POST | `/api/v1/documents/upload` | Upload a document for Gemini-based extraction |
| POST | `/api/v1/verification/run` | Run the configured invoice-versus-bank verification example |
| POST | `/api/v1/graph/detect-cycles` | Detect circular paths in the Kaveri demo transaction graph |
| POST | `/api/v1/credit/assess` | Compute an assessment from the service's configured/default inputs |
| POST | `/api/v1/simulations/run` | Run a financial stress simulation |
| POST | `/api/v1/investigations/{investigation_id}/query` | Investigator query endpoint |
| GET/POST | `/api/v1/integrations/whatsapp/webhook` | Optional WhatsApp webhook endpoints |

Some Python endpoints currently use fixed Kaveri demo inputs or return a readiness response rather than a complete production workflow. Review the implementation before treating an endpoint as production-ready.

## Demo mode and sample data

The project includes Kaveri Textiles demo data for demonstrating the investigation workflow. Demo records are synthetic/sample data and must be clearly distinguished from real borrower information.

When the Python backend is unavailable, the Node BFF can return demo data if demo mode is enabled. The health endpoint reports whether the Python backend is configured and reachable.

For a credible demonstration, show the source document, extracted records, reconciliation finding, graph relationship, calculation inputs and simulation assumptions. Do not present generated demo findings as verified facts about a real business.

## Security and responsible use

- Keep Gemini keys, Firebase credentials, service tokens and database credentials on the server or in a secure secrets manager.
- Do not commit `.env` files or real customer financial records.
- Restrict access to borrower documents and investigation results using authenticated, least-privilege access controls.
- Validate uploads, MIME types, file sizes and extracted values.
- Preserve source-document references and an audit trail for material findings.
- Treat AI-generated extraction and explanations as fallible; route low-confidence or unreadable data to manual review.
- Do not use graph patterns or synthetic-document indicators as standalone proof of fraud.
- Keep credit decisions under authorized human review and test scoring logic for accuracy, bias and explainability before any real lending use.

See [security_spec.md](./security_spec.md) and [Firestore rules](./firestore.rules) for repository security materials. These files should be reviewed and tested as part of deployment; their presence alone does not establish that the application is secure.

## Current limitations

EvidenceOS is a prototype / hackathon-stage decision-support project. The following distinctions matter:

- Demo mode and Kaveri sample data are not live financial integrations.
- The Python service is optional and some endpoints use fixed demo inputs.
- PostgreSQL models and dependencies are present, but production migrations, storage lifecycle and persistence integration need deployment verification.
- WhatsApp integration is disabled until valid credentials and webhook configuration are supplied.
- PaddleOCR is an optional adapter and is disabled by default; the current adapter requires implementation/dependency setup before it can be used.
- Credit indicators are internal prototype outputs, not externally validated credit scores or lending recommendations.
- No performance, accuracy, fraud-detection or credit-default metrics are claimed here because benchmark results are not documented in this README.

## Development checks

Before submitting changes, run:

```bash
npm run lint
npm run build
```

If you modify the Python service, also run your configured Python tests and verify the health and API endpoints in an environment with the required dependencies and secrets. Do not treat a successful frontend build as proof that external integrations or end-to-end workflows work.

## Team

**Team Too Soon**

Built as a prototype for evidence-driven MSME credit investigation and lender decision support.

## Disclaimer

EvidenceOS is an experimental software prototype. It does not provide regulated credit ratings, guarantee loan repayment, establish fraud, or replace a lender's underwriting policies, due diligence or human decision-making. Use only authorized data and independently validate all outputs before operational use.
