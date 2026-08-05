from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import Customer, User
from app.schemas.dtos import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Clientes y Cuentas Corrientes"])

@router.get("", response_model=List[CustomerResponse])
def get_customers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Customer).order_by(Customer.name.asc()).all()

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = Customer(
        name=data.name,
        phone=data.phone,
        email=data.email,
        address=data.address,
        debt_balance=data.debt_balance
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.post("/{customer_id}/pay_debt")
def pay_customer_debt(customer_id: int, amount: float, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    customer.debt_balance -= amount
    if customer.debt_balance < 0:
        customer.debt_balance = 0.0
    db.commit()
    return {"message": f"Pago registrado. Nueva deuda de {customer.name}: ${customer.debt_balance:.2f}"}
