from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import Product, Category, User
from app.schemas.dtos import (
    ProductCreate, ProductUpdate, ProductResponse,
    CategoryCreate, CategoryResponse
)

router = APIRouter(prefix="/products", tags=["Gestión de Productos"])

@router.get("", response_model=List[ProductResponse])
def get_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    low_stock_only: bool = False,
    out_of_stock_only: bool = False,
    sort_by_stock: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(Product.is_active == True)

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if low_stock_only:
        query = query.filter(Product.current_stock <= Product.min_stock)
    if out_of_stock_only:
        query = query.filter(Product.current_stock <= 0)

    if sort_by_stock:
        query = query.order_by(Product.current_stock.asc())
    else:
        query = query.order_by(Product.name.asc())

    products = query.all()
    
    result = []
    for p in products:
        item = ProductResponse.model_validate(p)
        item.category_name = p.category.name if p.category else None
        result.append(item)
    return result

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = Product(
        name=data.name,
        category_id=data.category_id,
        cost_price=data.cost_price,
        sale_price=data.sale_price,
        current_stock=data.current_stock,
        min_stock=data.min_stock,
        notes=data.notes
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    res = ProductResponse.model_validate(product)
    res.category_name = product.category.name if product.category else None
    return res

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    res = ProductResponse.model_validate(product)
    res.category_name = product.category.name if product.category else None
    return res

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product.is_active = False
    db.commit()
    return {"message": "Producto eliminado exitosamente"}

# --- Categories ---
@router.get("/categories/list", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name.asc()).all()

@router.post("/categories/create", response_model=CategoryResponse)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    category = Category(name=data.name, description=data.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
