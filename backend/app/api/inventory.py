from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import Product, StockMovement, User
from app.schemas.dtos import StockMovementCreate, StockMovementResponse

router = APIRouter(prefix="/inventory", tags=["Movimientos de Stock"])

@router.post("/movements", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def create_movement(data: StockMovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if data.type == "INGRESO":
        product.current_stock += data.quantity
    elif data.type == "SALIDA":
        product.current_stock -= data.quantity
    elif data.type == "PERDIDA_ROTURA":
        product.current_stock -= data.quantity
    else:
        raise HTTPException(status_code=400, detail="Tipo de movimiento no válido (INGRESO, SALIDA, PERDIDA_ROTURA)")

    movement = StockMovement(
        product_id=product.id,
        user_id=current_user.id,
        type=data.type,
        quantity=data.quantity,
        reason=data.reason
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    return StockMovementResponse(
        id=movement.id,
        product_id=movement.product_id,
        product_name=product.name,
        user_name=current_user.full_name,
        type=movement.type,
        quantity=movement.quantity,
        reason=movement.reason,
        created_at=movement.created_at
    )

@router.get("/movements", response_model=List[StockMovementResponse])
def get_movements(limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    movements = db.query(StockMovement).order_by(StockMovement.created_at.desc()).limit(limit).all()
    res = []
    for m in movements:
        res.append(StockMovementResponse(
            id=m.id,
            product_id=m.product_id,
            product_name=m.product.name if m.product else "Desconocido",
            user_name=m.user.full_name if m.user else "Sistema",
            type=m.type,
            quantity=m.quantity,
            reason=m.reason,
            created_at=m.created_at
        ))
    return res
