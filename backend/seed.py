import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.entities import (
    Role, User, Category, Product
)

def seed_database():
    # Drop and recreate tables to ensure fresh schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Roles
        role_admin = Role(name="admin", description="Administrador / Dueño del Kiosco")
        role_emp = Role(name="empleado", description="Empleado de Kiosco")
        db.add_all([role_admin, role_emp])
        db.commit()
        db.refresh(role_admin)
        db.refresh(role_emp)

        # 2. Users
        user_admin = User(
            email="admin@kiosco.com",
            password_hash=get_password_hash("admin123"),
            full_name="Dueño",
            role_id=role_admin.id,
            is_active=True
        )
        user_emp = User(
            email="empleado@kiosco.com",
            password_hash=get_password_hash("empleado123"),
            full_name="Empleado",
            role_id=role_emp.id,
            is_active=True
        )
        db.add_all([user_admin, user_emp])
        db.commit()

        # 3. Categories
        cats = ["Gaseosas", "Golosinas", "Cigarrillos", "Galletitas", "Bebidas", "Snacks", "Limpieza", "Almacén"]
        cat_objs = {}
        for c in cats:
            obj = Category(name=c, description=f"Productos de {c}")
            db.add(obj)
            db.commit()
            db.refresh(obj)
            cat_objs[c] = obj

        # 4. Kiosk Products (Neighborhood Kiosk Specialties in Argentina)
        products_seed = [
            {
                "name": "Alfajor Guaymallén Chocolate",
                "category_id": cat_objs["Golosinas"].id,
                "cost_price": 250.0,
                "sale_price": 450.0,
                "current_stock": 60.0,
                "min_stock": 15.0,
                "notes": "Producto de altísima rotación"
            },
            {
                "name": "Coca-Cola 500ml",
                "category_id": cat_objs["Gaseosas"].id,
                "cost_price": 900.0,
                "sale_price": 1600.0,
                "current_stock": 24.0,
                "min_stock": 12.0,
                "notes": "Mantener en heladera de exhibición"
            },
            {
                "name": "Cigarrillos Marlboro Box 20",
                "category_id": cat_objs["Cigarrillos"].id,
                "cost_price": 2400.0,
                "sale_price": 2800.0,
                "current_stock": 4.0, # LOW STOCK ALERT!
                "min_stock": 10.0,
                "notes": "Pedir 2 gruesas más"
            },
            {
                "name": "Galletitas Don Satur Saladas 200g",
                "category_id": cat_objs["Galletitas"].id,
                "cost_price": 400.0,
                "sale_price": 750.0,
                "current_stock": 0.0, # OUT OF STOCK ALERT!
                "min_stock": 8.0,
                "notes": "Agotado. Volver a comprar pronto"
            },
            {
                "name": "Papas Lays Clásicas 95g",
                "category_id": cat_objs["Snacks"].id,
                "cost_price": 1100.0,
                "sale_price": 2100.0,
                "current_stock": 3.0, # LOW STOCK ALERT!
                "min_stock": 8.0,
                "notes": "Snack preferido del mediodía"
            },
            {
                "name": "Gaseosa Manaos Cola 2.25L",
                "category_id": cat_objs["Gaseosas"].id,
                "cost_price": 800.0,
                "sale_price": 1400.0,
                "current_stock": 18.0,
                "min_stock": 6.0,
                "notes": "Súper vendida los fines de semana"
            },
            {
                "name": "Caramelos Flyn Paff Tira",
                "category_id": cat_objs["Golosinas"].id,
                "cost_price": 300.0,
                "sale_price": 600.0,
                "current_stock": 40.0,
                "min_stock": 10.0,
                "notes": ""
            }
        ]

        for item in products_seed:
            db.add(Product(**item))
        db.commit()

        print("Base de datos de Stock de Kiosco sembrada con éxito.")

    except Exception as e:
        print(f"Error al sembrar la base de datos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
