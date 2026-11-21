from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class BusinessEntityModel(Base):
    __tablename__ = "business_entities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    gstin: Mapped[str] = mapped_column(String(32), nullable=True)
    udyam_id: Mapped[str] = mapped_column(String(48), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EvidenceDocumentModel(Base):
    __tablename__ = "evidence_documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    business_id: Mapped[str] = mapped_column(ForeignKey("business_entities.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    ocr_status: Mapped[str] = mapped_column(String(32), default="pending")
    verification_status: Mapped[str] = mapped_column(String(48), default="Extracted")
    storage_uri: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ExtractedRecordModel(Base):
    __tablename__ = "extracted_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("evidence_documents.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    record_type: Mapped[str] = mapped_column(String(64), nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_value: Mapped[str] = mapped_column(String(128), nullable=True)
    corrected_value: Mapped[str] = mapped_column(String(128), nullable=True)
    readability: Mapped[str] = mapped_column(String(24), default="clear")
    needs_manual_review: Mapped[bool] = mapped_column(Boolean, default=False)


class SimulationRunModel(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    business_id: Mapped[str] = mapped_column(ForeignKey("business_entities.id"), nullable=False)
    scenario_type: Mapped[str] = mapped_column(String(48), nullable=False)
    shock_percent: Mapped[float] = mapped_column(Float, nullable=False)
    simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    assumptions_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    results_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
