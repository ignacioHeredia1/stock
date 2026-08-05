from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import (
    Sale, SaleItem, Product, StockMovement, CashSession,
    Customer, User, CashSessionStatus, MovementType, SaleStatus, PaymentMethod
)
from app.schemas.dtos import SaleCreate, SaleResponse

router = APIRouter(prefix="/sales", tags=["Ventas (POS)"])

@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(data: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not data.items:
        raise HTTPException(status_code=400, detail="La venta debe contener al menos un producto")

    # 1. Verify active cash session
    active_session = db.query(CashSession).filter(
        CashSession.status == CashSessionStatus.OPEN.value
    ).first()
    if not active_session:
        raise HTTPException(status_code=400, detail="Debe abrir la caja antes de registrar ventas")

    # 2. Calculate subtotal, taxes and check stock
    subtotal = 0.0
    tax_total = 0.0
    sale_items_to_create = []

    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto ID {item.product_id} no encontrado")

        if product.current_stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{product.name}'. Disponible: {product.current_stock}"
            )

        item_subtotal = item.unit_price * item.quantity
        subtotal += item_subtotal

        # Tax calculation
        tax_part = item_subtotal * (product.tax_rate / 100.0)
        tax_total += tax_part

        # Deduct product stock
        product.current_stock -= item.quantity

        # Create stock movement record
        stock_mvt = StockMovement(
            product_id=product.id,
            user_id=current_user.id,
            type=MovementType.SALE.value,
            quantity=-item.quantity,
            reason=f"Venta ID temporal"
        )
        db.add(stock_mvt)

        sale_items_to_create.append({
            "product_id": product.id,
            "unit_price": item.unit_price,
            "quantity": item.quantity,
            "subtotal": item_subtotal
        })

    total = subtotal - data.discount
    if total < 0:
        total = 0.0

    change_amount = data.received_amount - total if data.received_amount >= total else 0.0

    # 3. Customer debt if payment_method is CURRENT_ACCOUNT
    customer_name = None
    if data.payment_method == PaymentMethod.CURRENT_ACCOUNT.value:
        if not data.customer_id:
            raise HTTPException(status_code=400, detail="Debe seleccionar un cliente para venta fiada (Cuenta Corriente)")
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        customer.debt_balance += total
        customer_name = customer.name
    elif data.customer_id:
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if customer:
            customer_name = customer.name

    # 4. Create Sale
    sale = Sale(
        cash_session_id=active_session.id,
        user_id=current_user.id,
        customer_id=data.customer_id,
        invoice_type=data.invoice_type,
        payment_method=data.payment_method,
        subtotal=subtotal,
        discount=data.discount,
        tax_amount=tax_total,
        total=total,
        received_amount=data.received_amount,
        change_amount=change_amount,
        status=SaleStatus.COMPLETED.value
    )
    db.add(sale)
    db.flush() # get sale.id

    for item_dict in sale_items_to_create:
        s_item = SaleItem(
            sale_id=sale.id,
            product_id=item_dict["product_id"],
            unit_price=item_dict["unit_price"],
            quantity=item_dict["quantity"],
            subtotal=item_dict["subtotal"]
        )
        db.add(s_item)

    db.commit()
    db.refresh(sale)

    return _build_sale_response(sale)

@router.get("", response_model=List[SaleResponse])
def get_sales(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sales = db.query(Sale).order_by(Sale.created_at.desc()).limit(limit).all()
    return [_build_sale_response(s) for s in sales]

@router.post("/{sale_id}/cancel")
def cancel_sale(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if sale.status == SaleStatus.CANCELLED.value:
        raise HTTPException(status_code=400, detail="La venta ya está anulada")

    sale.status = SaleStatus.CANCELLED.value

    # Restore stock
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.current_stock += item.quantity
            stock_mvt = StockMovement(
                product_id=product.id,
                user_id=current_user.id,
                type=MovementType.IN.value,
                quantity=item.quantity,
                reason=f"Anulación Venta #{sale.id}"
            )
            db.add(stock_mvt)

    # Revert customer debt if applicable
    if sale.payment_method == PaymentMethod.CURRENT_ACCOUNT.value and sale.customer_id:
        customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
        if customer:
            customer.debt_balance -= sale.total

    db.commit()
    return {"message": f"Venta #{sale_id} anulada exitosamente y stock restaurado"}

def _build_sale_response(sale: Sale) -> SaleResponse:
    items_resp = []
    for item in sale.items:
        items_resp.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.name if item.product else "Producto eliminado",
            "unit_price": item.unit_price,
            "quantity": item.quantity,
            "subtotal": item.subtotal
        })

    return SaleResponse(
        id=sale.id,
        cash_session_id=sale.cash_session_id,
        user_name=sale.user.full_name if sale.user else "Desconocido",
        customer_name=sale.customer.name if sale.customer else None,
        invoice_type=sale.invoice_type,
        payment_method=sale.payment_method,
        subtotal=sale.subtotal,
        discount=sale.discount,
        tax_amount=sale.tax_amount,
        total=sale.total,
        received_amount=sale.received_amount,
        change_amount=sale.change_amount,
        status=sale.status,
        created_at=sale.created_at,
        items=items_resp
    )
