from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role_name: str
    is_active: bool

    class Config:
        from_attributes = True

# --- Category Schemas ---
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryResponse(CategoryCreate):
    id: int
    class Config:
        from_attributes = True

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    cost_price: float = 0.0
    sale_price: float = 0.0
    current_stock: float = 0.0
    min_stock: float = 5.0
    notes: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    current_stock: Optional[float] = None
    min_stock: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    is_active: bool
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Stock Movement Schemas ---
class StockMovementCreate(BaseModel):
    product_id: int
    type: str # INGRESO, SALIDA, PERDIDA_ROTURA
    quantity: float
    reason: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    user_name: str
    type: str
    quantity: float
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Purchase Schemas ---
class PurchaseItemCreate(BaseModel):
    product_id: int
    unit_cost: float
    quantity: float

class PurchaseCreate(BaseModel):
    items: List[PurchaseItemCreate]

class PurchaseItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    unit_cost: float
    quantity: float
    subtotal: float

class PurchaseResponse(BaseModel):
    id: int
    user_name: str
    total_amount: float
    created_at: datetime
    items: List[PurchaseItemResponse]

    class Config:
        from_attributes = True

# --- Dashboard Summary Schema ---
class DashboardSummary(BaseModel):
    total_products_count: int
    low_stock_count: int
    out_of_stock_count: int
    total_inventory_value: float # $ Invertido
    recent_products: List[dict]
    restock_alert_products: List[dict]
