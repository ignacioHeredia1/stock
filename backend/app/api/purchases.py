from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import Purchase, PurchaseItem, Product, StockMovement, User, MovementType
from app.schemas.dtos import PurchaseCreate, PurchaseResponse, PurchaseItemResponse

router = APIRouter(prefix="/purchases", tags=["Compras y Reposición de Mercadería"])

@router.post("", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(data: PurchaseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not data.items:
        raise HTTPException(status_code=400, detail="La compra debe incluir al menos un producto")

    total_amount = 0.0
    purchase_items_to_create = []

    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto ID {item.product_id} no encontrado")

        item_subtotal = item.unit_cost * item.quantity
        total_amount += item_subtotal

        # 1. Update product cost price if provided
        if item.unit_cost > 0:
            product.cost_price = item.unit_cost

        # 2. AUTOMATICALLY INCREASE PRODUCT STOCK
        product.current_stock += item.quantity

        # 3. Create stock movement record
        stock_mvt = StockMovement(
            product_id=product.id,
            user_id=current_user.id,
            type="COMPRA",
            quantity=item.quantity,
            reason="Ingreso por Compra de Mercadería"
        )
        db.add(stock_mvt)

        purchase_items_to_create.append({
            "product_id": product.id,
            "unit_cost": item.unit_cost,
            "quantity": item.quantity,
            "subtotal": item_subtotal
        })

    purchase = Purchase(
        user_id=current_user.id,
        total_amount=total_amount
    )
    db.add(purchase)
    db.flush()

    for item_dict in purchase_items_to_create:
        p_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=item_dict["product_id"],
            unit_cost=item_dict["unit_cost"],
            quantity=item_dict["quantity"],
            subtotal=item_dict["subtotal"]
        )
        db.add(p_item)

    db.commit()
    db.refresh(purchase)

    return _build_purchase_response(purchase)

@router.get("", response_model=List[PurchaseResponse])
def get_purchases(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    purchases = db.query(Purchase).order_by(Purchase.created_at.desc()).limit(limit).all()
    return [_build_purchase_response(p) for p in purchases]

def _build_purchase_response(purchase: Purchase) -> PurchaseResponse:
    items_resp = []
    for item in purchase.items:
        items_resp.append(PurchaseItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product.name if item.product else "Producto eliminado",
            unit_cost=item.unit_cost,
            quantity=item.quantity,
            subtotal=item.subtotal
        ))

    return PurchaseResponse(
        id=purchase.id,
        user_name=purchase.user.full_name if purchase.user else "Usuario",
        total_amount=purchase.total_amount,
        created_at=purchase.created_at,
        items=items_resp
    )
