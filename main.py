from decimal import Decimal
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from app.core.config import settings
from app.credit.engine import compute_credit_assessment
from app.graph.engines import build_kaveri_demo_transaction_graph
from app.ocr.service import run_gemini_ocr
from app.schemas.contracts import (
    CreditInputsSchema,
    InvestigatorQuerySchema,
    SimulationRequestSchema,
)
from app.simulation.engine import DEFAULT_KAVERI_BASELINE, run_stress_simulation
from app.verification.engine import verify_invoice_vs_bank

app = FastAPI(
    title="EvidenceOS Financial Intelligence API",
    version="1.0.0",
    description="External Python FastAPI backend for Gemini OCR, NetworkX graph intelligence, deterministic verification, credit scoring, and financial stress simulation.",
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "evidenceos-python-fastapi",
        "demoMode": settings.demo_mode,
        "geminiModel": settings.gemini_model,
        "paddleOcrEnabled": settings.enable_paddle_ocr,
        "whatsappConfigured": bool(settings.whatsapp_access_token and settings.whatsapp_verify_token),
    }


@app.post("/api/v1/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 20 MB limit.")
    result = await run_gemini_ocr(content, file.content_type or "application/octet-stream", file.filename or "DOC")
    return result


@app.post("/api/v1/verification/run")
async def run_verification():
    finding = verify_invoice_vs_bank(
        invoice_id="INV001",
        invoice_doc_id="DOC001",
        billed_amount=Decimal("25000.00"),
        bank_txn_id="TXN-8841",
        bank_doc_id="DOC002",
        bank_credit_amount=Decimal("20000.00"),
    )
    return {"demoMode": settings.demo_mode, "findings": [finding.model_dump()] if finding else []}


@app.post("/api/v1/graph/detect-cycles")
async def detect_cycles(max_length: int = 4):
    tx_graph = build_kaveri_demo_transaction_graph()
    cycles = tx_graph.detect_circular_paths(max_length=max_length)
    return {
        "demoMode": settings.demo_mode,
        "engine": "networkx.MultiDiGraph",
        "cycleCount": len(cycles),
        "cycles": cycles,
        "note": "Circular transactions are investigation signals, not proof of fraud.",
    }


@app.post("/api/v1/credit/assess")
async def assess_credit(inputs: CreditInputsSchema = DEFAULT_KAVERI_BASELINE):
    return compute_credit_assessment(inputs, unresolved_critical_count=2, is_demo=settings.demo_mode)


@app.post("/api/v1/simulations/run")
async def run_simulation(request: SimulationRequestSchema):
    return run_stress_simulation(request)


@app.post("/api/v1/investigations/{investigation_id}/query")
async def query_investigator(investigation_id: str, payload: InvestigatorQuerySchema):
    return {
        "investigationId": investigation_id,
        "query": payload.query,
        "mode": payload.mode,
        "model": settings.gemini_reasoning_model,
        "status": "ready_for_gemini_tool_loop",
    }


@app.get("/api/v1/integrations/whatsapp/webhook")
async def verify_whatsapp_webhook(
    hub_mode: str = Query(default="", alias="hub.mode"),
    hub_verify_token: str = Query(default="", alias="hub.verify_token"),
    hub_challenge: str = Query(default="", alias="hub.challenge"),
):
    if not settings.whatsapp_verify_token:
        raise HTTPException(status_code=503, detail="WhatsApp integration disabled until credentials are configured.")
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        return int(hub_challenge) if hub_challenge.isdigit() else hub_challenge
    raise HTTPException(status_code=403, detail="Invalid WhatsApp verification token.")


@app.post("/api/v1/integrations/whatsapp/webhook")
async def receive_whatsapp_webhook(payload: dict):
    if not settings.whatsapp_access_token:
        raise HTTPException(status_code=503, detail="WhatsApp integration disabled until credentials are configured.")
    return {"received": True, "policy": "Plain text ingested directly; image/PDF attachments routed to OCR."}
