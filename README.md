# EvidenceOS — Python FastAPI Intelligence Backend

Dedicated Python processing service separated from the Node.js BFF and React frontend.

## Responsibilities
- Multimodal OCR & PDF extraction (`google-genai` SDK + PyMuPDF fallback + optional disabled `PaddleOCR` adapter)
- Deterministic financial verification (`Decimal`, `datetime`, `hashlib`, `RapidFuzz`)
- Dual `networkx.MultiDiGraph` engines (Evidence Knowledge Graph & Financial Transaction Graph with cycle detection)
- Transparent deterministic Credit Readiness & Amortization Loan Engine
- Isolated Financial Stress-Test Simulation Engine (`simulated: true`)
- Optional WhatsApp Business Platform Cloud API Webhook (disabled until credentials configured)
- PostgreSQL persistence via SQLAlchemy async models

## Running Locally
```bash
cd python-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
OpenAPI documentation is served automatically at `http://localhost:8000/docs`.
