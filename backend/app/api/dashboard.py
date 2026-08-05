from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import Product, User
from app.schemas.dtos import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard de Inventario"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    products = db.query(Product).filter(Product.is_active == True).all()

    total_products_count = len(products)
    low_stock_count = sum(1 for p in products if p.current_stock > 0 and p.current_stock <= p.min_stock)
    out_of_stock_count = sum(1 for p in products if p.current_stock <= 0)

    # Total Inventory Investment Value = sum(current_stock * cost_price)
    total_inventory_value = sum(max(0, p.current_stock) * p.cost_price for p in products)

    # Recent 5 added products
    recent = []
    for p in sorted(products, key=lambda x: x.created_at, reverse=True)[:5]:
        recent.append({
            "id": p.id,
            "name": p.name,
            "category_name": p.category.name if p.category else "General",
            "cost_price": p.cost_price,
            "sale_price": p.sale_price,
            "current_stock": p.current_stock
        })

    # Restock alert products (stock <= min_stock, sorted by lowest stock first)
    restock_alert = []
    alert_list = [p for p in products if p.current_stock <= p.min_stock]
    for p in sorted(alert_list, key=lambda x: x.current_stock)[:8]:
        restock_alert.append({
            "id": p.id,
            "name": p.name,
            "category_name": p.category.name if p.category else "General",
            "current_stock": p.current_stock,
            "min_stock": p.min_stock,
            "is_out_of_stock": p.current_stock <= 0
        })

    return DashboardSummary(
        total_products_count=total_products_count,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        total_inventory_value=total_inventory_value,
        recent_products=recent,
        restock_alert_products=restock_alert
    )
