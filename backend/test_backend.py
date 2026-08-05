import sys
import os
import urllib.parse
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

print("Probando API REST de Sistema de Stock para Kioscos...")

# 1. Login
res = client.post("/api/v1/auth/login", json={"email": "admin@kiosco.com", "password": "admin123"})
print("1. Login status:", res.status_code)
assert res.status_code == 200
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Get Products
res = client.get("/api/v1/products", headers=headers)
print("2. Products count:", len(res.json()))

# 3. Get Dashboard Summary (Checking Total Inventory Investment Value)
res = client.get("/api/v1/dashboard/summary", headers=headers)
print("3. Dashboard summary status:", res.status_code, "Total Value ($ Invertido):", res.json()["total_inventory_value"])

# 4. Register Purchase from Supplier (Automatic Stock Update)
products = client.get("/api/v1/products", headers=headers).json()
prod = products[0]
initial_stock = prod["current_stock"]

purchase_payload = {
    "items": [
        {
            "product_id": prod["id"],
            "unit_cost": prod["cost_price"],
            "quantity": 10.0
        }
    ]
}

res = client.post("/api/v1/purchases", json=purchase_payload, headers=headers)
print("4. Purchase status:", res.status_code, "Purchase Total:", res.json()["total_amount"])

# Verify Stock increased automatically
prod_after = client.get(f"/api/v1/products?search={urllib.parse.quote(prod['name'])}", headers=headers).json()[0]
print("5. Initial stock:", initial_stock, "-> New stock after purchase:", prod_after["current_stock"])
assert prod_after["current_stock"] == initial_stock + 10.0

print("¡TODAS LAS PRUEBAS DEL SISTEMA DE STOCK PASARON EXITOSAMENTE!")
