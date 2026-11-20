# EvidenceOS
### Turn scattered financial records into connected, verifiable intelligence.

EvidenceOS is an AI-powered financial investigation platform designed to help investigators and analysts understand complex business transactions. It brings documents, transaction records, and relationships into one evidence workspace—making suspicious patterns easier to trace, inspect, and explain.

> **Core idea:** Don't just flag an unusual transaction. Show the evidence, the relationships, and the reasoning behind the finding.

---

## The problem

Financial investigations often involve fragmented invoices, statements, ledgers, and transaction data. Reviewing these records manually makes it difficult to:

- Connect transactions across multiple entities and documents.
- Identify circular fund flows and suspicious transaction chains.
- Trace the origin and movement of money.
- Explain findings with clear, reviewable supporting evidence.

## Our solution

EvidenceOS converts unstructured records and transaction data into a connected investigation workspace. It combines document processing, relationship analysis, and AI-assisted investigation so users can move from raw records to evidence-backed findings.

## Key capabilities

| Capability | What it does |
|---|---|
| **Document intelligence** | Extracts relevant information from uploaded financial documents using OCR and text processing. |
| **Evidence graph** | Maps entities, accounts, documents, and transactions as connected nodes and relationships. |
| **Transaction tracing** | Helps investigators follow the movement of funds across connected transactions. |
| **Circular-flow detection** | Identifies potential circular transaction patterns for further review. |
| **AI investigator** | Supports natural-language exploration of the available evidence and investigation context. |
| **Scenario stress testing** | Allows users to examine how selected assumptions or transaction changes affect an investigation. |
| **Verification reports** | Organizes findings and supporting evidence into a reviewable report. |

*Automated findings are investigative leads, not proof of wrongdoing. Human review and source verification remain essential.*

## How it works

1. **Ingest** — Upload financial documents and transaction records.
2. **Extract** — OCR and text-processing components identify relevant fields and entities.
3. **Connect** — Records are normalized and linked into an evidence graph.
4. **Investigate** — Graph analysis surfaces relationships, transaction paths, and potential anomalies.
5. **Explain** — The AI-assisted workflow helps explore findings while keeping the underlying evidence accessible.
6. **Verify** — Review the source records and generate a structured investigation report.

## System architecture

The platform is designed around a web interface and a separate analysis service.

- **Frontend:** React and TypeScript
- **Graph visualization:** Cytoscape.js
- **Analysis API:** Python and FastAPI
- **Graph analysis:** NetworkX
- **Document extraction:** OCR and text-matching components
- **Data layer:** PostgreSQL
- **AI layer:** Language-model-assisted evidence exploration

The analysis service exposes functionality through REST APIs. Actual records and simulated demonstration data should remain clearly separated.

## What makes EvidenceOS different?

EvidenceOS is built around **traceability**, not just anomaly alerts.

- **Relationship-first investigation:** Understand how records and entities connect.
- **Evidence-linked findings:** Keep the supporting records close to each investigative result.
- **Explainable workflow:** Make it easier to inspect why a pattern was surfaced.
- **Investigator-in-the-loop:** Treat AI output as assistance for human review, not an automatic accusation.

## Getting started

### Prerequisites

- Node.js (LTS recommended)
- npm

### Run the frontend

```bash
npm install
npm run dev
```

Configure the required environment variables in a local `.env.local` file before running features that depend on external services. Never commit API keys, credentials, or private financial data.

> The frontend and analysis service may be configured and run separately. Backend setup instructions will be added alongside the service implementation.

## Project status

EvidenceOS is an evolving project. Features and integrations are under active development; the repository is the source of truth for the current implementation.

## Responsible use

EvidenceOS is intended to support financial review and investigation. It does not independently determine fraud, legal liability, or criminal intent. All flagged patterns require validation against original records and appropriate human oversight.

---

**Built by Team Too Soon**
