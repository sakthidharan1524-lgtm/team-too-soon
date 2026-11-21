from typing import Any, Dict, List
from app.core.config import settings


class PaddleOCRAdapter:
    """
    Optional local OCR fallback adapter. Disabled by default (ENABLE_PADDLE_OCR=false).
    Never bundles model weights inside the repository.
    """

    def __init__(self) -> None:
        self.enabled = settings.enable_paddle_ocr

    def extract_text(self, image_bytes: bytes) -> Dict[str, Any]:
        if not self.enabled:
            return {
                "used": False,
                "reason": "PaddleOCR adapter is disabled by configuration (ENABLE_PADDLE_OCR=false).",
            }
        raise RuntimeError(
            "Install optional paddleocr package in deployment container before enabling ENABLE_PADDLE_OCR=true."
        )


def extract_pdf_pages_fallback(pdf_bytes: bytes, max_pages: int = 12) -> List[Dict[str, Any]]:
    """Controlled batch PDF text/render fallback via PyMuPDF retaining exact page numbers."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return [{"pageNumber": 1, "status": "fallback_unavailable", "text": ""}]

    results: List[Dict[str, Any]] = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for idx, page in enumerate(doc):
            if idx >= max_pages:
                break
            results.append(
                {
                    "pageNumber": idx + 1,
                    "status": "extracted",
                    "text": page.get_text("text"),
                }
            )
    return results


async def run_gemini_ocr(file_bytes: bytes, mime_type: str, document_id: str) -> Dict[str, Any]:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY must be configured in the Python service environment.")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            (
                f"Extract all readable financial records for {document_id} as strict JSON. "
                "Preserve Tamil/Hindi/English scripts. Set unreadable amounts to null and needsManualReview=true."
            ),
        ],
    )
    return {"documentId": document_id, "modelUsed": settings.gemini_model, "rawOutput": response.text}
