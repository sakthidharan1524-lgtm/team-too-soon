from decimal import Decimal, InvalidOperation
import hashlib
from typing import Dict, List, Optional
from app.schemas.contracts import FindingSchema


def sha256_fingerprint(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def safe_decimal(value: Optional[str]) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        cleaned = str(value).replace(",", "").replace("₹", "").strip()
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None


def verify_invoice_vs_bank(
    invoice_id: str,
    invoice_doc_id: str,
    billed_amount: Decimal,
    bank_txn_id: str,
    bank_doc_id: str,
    bank_credit_amount: Decimal,
) -> Optional[FindingSchema]:
    """Deterministic Decimal reconciliation between billed invoice total and bank credit."""
    diff = billed_amount - bank_credit_amount
    if diff == Decimal("0"):
        return None

    return FindingSchema(
        findingId=f"FND-{invoice_id}-{bank_txn_id}",
        findingType="invoice_amount_mismatch",
        severity="Critical" if abs(diff) >= Decimal("1000") else "Warning",
        description=f"Amount discrepancy detected on {invoice_id}: variance of ₹{abs(diff):,.2f}",
        explanation=(
            f"Invoice {invoice_id} bills ₹{billed_amount:,.2f}, whereas corresponding bank "
            f"transaction {bank_txn_id} currently reflects ₹{bank_credit_amount:,.2f} "
            f"(difference ₹{abs(diff):,.2f}). Requires investigation; may reflect partial cash settlement."
        ),
        affectedRecords=[invoice_id, bank_txn_id],
        sourceDocumentIds=[invoice_doc_id, bank_doc_id],
        detectionRule="RULE_DECIMAL_INVOICE_BANK_RECONCILIATION",
        evidenceStatus="CONTRADICTED",
        reviewStatus="Requires Manual Review",
    )


def verify_duplicate_fingerprints(doc_hashes: Dict[str, str]) -> List[FindingSchema]:
    seen: Dict[str, str] = {}
    findings: List[FindingSchema] = []
    for doc_id, digest in doc_hashes.items():
        if digest in seen:
            findings.append(
                FindingSchema(
                    findingId=f"FND-DUP-{doc_id}",
                    findingType="duplicate_financial_record",
                    severity="Warning",
                    description=f"Duplicate file fingerprint detected between {seen[digest]} and {doc_id}",
                    explanation="Exact SHA-256 match indicates identical binary evidence was uploaded twice.",
                    affectedRecords=[seen[digest], doc_id],
                    sourceDocumentIds=[seen[digest], doc_id],
                    detectionRule="RULE_SHA256_DUPLICATE_GUARD",
                    evidenceStatus="REQUIRES_MANUAL_REVIEW",
                    reviewStatus="Requires Manual Review",
                )
            )
        else:
            seen[digest] = doc_id
    return findings
