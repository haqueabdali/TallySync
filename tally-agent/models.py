from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SyncOperation(str, Enum):
    SALES_ORDER = "sales_order"
    SALES_VOUCHER = "sales_voucher"
    PURCHASE_VOUCHER = "purchase_voucher"
    CREDIT_NOTE = "credit_note"
    DEBIT_NOTE = "debit_note"
    INVENTORY_SYNC = "inventory_sync"
    CUSTOMER_SYNC = "customer_sync"

class SyncMessage(BaseModel):
    operation: SyncOperation
    company_id: str
    data: Dict[str, Any]
    message_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    retry_count: int = 0

class SyncResult(BaseModel):
    message_id: str
    success: bool
    tally_response: Optional[str] = None
    error: Optional[str] = None
    tally_voucher_no: Optional[str] = None
    processed_at: datetime = Field(default_factory=datetime.utcnow)