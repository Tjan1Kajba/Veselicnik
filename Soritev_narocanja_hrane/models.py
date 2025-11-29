from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class OrderItem(BaseModel):
    item_id: str
    quantity: int

class Order(BaseModel):
    user_id: str
    items: List[OrderItem]
    status: str = "pending"
    paid: bool = False


class StatusUpdate(BaseModel):
    status: str

class Payment(BaseModel):
    amount: float
    method: str
    transaction_id: Optional[str] = None
    timestamp: Optional[datetime] = None

class MenuItem(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    available: bool = True
