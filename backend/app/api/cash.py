from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import CashSession, CashMovement, Sale, User, CashSessionStatus, CashMovementType, SaleStatus
from app.schemas.dtos import CashOpenSchema, CashCloseSchema, CashMovementCreate, CashSessionResponse, CashMovementResponse

router = APIRouter(prefix="/cash", tags=["Caja Registradora"])

@router.get("/current", response_model=Optional[CashSessionResponse])
def get_current_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(CashSession).filter(CashSession.status == CashSessionStatus.OPEN.value).first()
    if not session:
        return None
    return _build_cash_response(session, db)

@router.post("/open", response_model=CashSessionResponse, status_code=status.HTTP_201_CREATED)
def open_cash_session(data: CashOpenSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(CashSession).filter(CashSession.status == CashSessionStatus.OPEN.value).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una sesión de caja abierta")

    session = CashSession(
        user_id=current_user.id,
        opening_amount=data.opening_amount,
        status=CashSessionStatus.OPEN.value,
        notes=data.notes
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _build_cash_response(session, db)

@router.post("/movement", response_model=CashMovementResponse)
def add_cash_movement(data: CashMovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(CashSession).filter(CashSession.status == CashSessionStatus.OPEN.value).first()
    if not session:
        raise HTTPException(status_code=400, detail="No hay una caja abierta para registrar movimientos")

    movement = CashMovement(
        cash_session_id=session.id,
        user_id=current_user.id,
        type=data.type,
        amount=data.amount,
        reason=data.reason
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    return CashMovementResponse(
        id=movement.id,
        type=movement.type,
        amount=movement.amount,
        reason=movement.reason,
        user_name=current_user.full_name,
        created_at=movement.created_at
    )

@router.post("/close", response_model=CashSessionResponse)
def close_cash_session(data: CashCloseSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(CashSession).filter(CashSession.status == CashSessionStatus.OPEN.value).first()
    if not session:
        raise HTTPException(status_code=400, detail="No hay ninguna caja abierta para cerrar")

    # Calculate total cash sales in this session
    cash_sales_sum = sum(
        s.total for s in session.sales if s.status == SaleStatus.COMPLETED.value and s.payment_method == "CASH"
    )

    # Calculate incomes and expenses
    incomes = sum(m.amount for m in session.movements if m.type == CashMovementType.INCOME.value)
    expenses = sum(m.amount for m in session.movements if m.type == CashMovementType.EXPENSE.value)

    expected_amount = session.opening_amount + cash_sales_sum + incomes - expenses
    difference = data.closing_amount_real - expected_amount

    session.closing_amount_expected = expected_amount
    session.closing_amount_real = data.closing_amount_real
    session.difference = difference
    session.status = CashSessionStatus.CLOSED.value
    session.closed_at = datetime.now(timezone.utc)
    if data.notes:
        session.notes = (session.notes or "") + f" | Cierre: {data.notes}"

    db.commit()
    db.refresh(session)
    return _build_cash_response(session, db)

def _build_cash_response(session: CashSession, db: Session) -> CashSessionResponse:
    movements_resp = []
    for m in session.movements:
        movements_resp.append(CashMovementResponse(
            id=m.id,
            type=m.type,
            amount=m.amount,
            reason=m.reason,
            user_name=m.session.user.full_name if m.session and m.session.user else "Usuario",
            created_at=m.created_at
        ))

    # Calculate expected cash sum if session is open
    expected = session.closing_amount_expected
    if session.status == CashSessionStatus.OPEN.value:
        cash_sales = sum(
            s.total for s in session.sales if s.status == SaleStatus.COMPLETED.value and s.payment_method == "CASH"
        )
        inc = sum(m.amount for m in session.movements if m.type == CashMovementType.INCOME.value)
        exp = sum(m.amount for m in session.movements if m.type == CashMovementType.EXPENSE.value)
        expected = session.opening_amount + cash_sales + inc - exp

    return CashSessionResponse(
        id=session.id,
        user_name=session.user.full_name if session.user else "Usuario",
        opening_amount=session.opening_amount,
        closing_amount_expected=expected,
        closing_amount_real=session.closing_amount_real,
        difference=session.difference,
        status=session.status,
        opened_at=session.opened_at,
        closed_at=session.closed_at,
        notes=session.notes,
        movements=movements_resp
    )
