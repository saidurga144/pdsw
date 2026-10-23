"""
AI Security Classification Interface Stubs
-----------------------------------------
This module provides strongly typed interfaces and data contracts for integrating
future Hugging Face NLP / anomaly classification models into the PDSW infrastructure.

Note: No fake AI logic or mock classifiers are executed here. Real inference endpoints
or weights should be configured when models are trained and deployed.
"""

from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
import datetime

class ThreatSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class SecurityEventType(str, Enum):
    ANOMALOUS_LOGIN = "ANOMALOUS_LOGIN"
    REPEATED_ROLE_SPOOFING = "REPEATED_ROLE_SPOOFING"
    SUSPICIOUS_DOCUMENT_HASH = "SUSPICIOUS_DOCUMENT_HASH"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    UNAUTHORIZED_WALLET_INTERACTION = "UNAUTHORIZED_WALLET_INTERACTION"

class SecurityEventInput(BaseModel):
    """Payload passed to the Hugging Face classification pipeline."""
    event_id: str
    event_type: SecurityEventType
    user_id: Optional[str] = None
    wallet_address: Optional[str] = None
    role: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    raw_payload_summary: str = Field(..., description="Sanitized text summary of request/document metadata for NLP classification")
    timestamp: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

class ClassificationScore(BaseModel):
    label: str
    score: float

class SecurityEventInferenceOutput(BaseModel):
    """Output returned by the Hugging Face inference pipeline."""
    event_id: str
    is_threat: bool
    threat_severity: ThreatSeverity
    confidence_score: float
    detected_categories: List[str]
    model_name: str
    model_version: str
    raw_scores: Optional[List[ClassificationScore]] = None
    recommended_action: str = Field(..., description="Action recommendation: ALLOW, FLAG_AUDITOR, BLOCK, REQUIRE_STEP_UP_AUTH")
    processed_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))

class HuggingFaceModelConfig(BaseModel):
    """Configuration for future Hugging Face model endpoint."""
    model_id: str = "distilbert-base-uncased-finetuned-pdsw-threats"
    endpoint_url: Optional[str] = None
    api_token_env_var: str = "HF_API_TOKEN"
    threshold: float = 0.85
    batch_size: int = 16
