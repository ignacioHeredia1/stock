from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import Product, Purchase, User

router = APIRouter(prefix="/reports", tags=["Reportes"])

@router.get("/stock/excel")
def export_stock_excel(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    products = db.query(Product).filter(Product.is_active == True).order_by(Product.name.asc()).all()
    data = []
    for p in products:
        data.append({
            "ID": p.id,
            "Nombre Producto": p.name,
            "Categoría": p.category.name if p.category else "",
            "Precio Compra ($)": p.cost_price,
            "Precio Venta ($)": p.sale_price,
            "Stock Actual": p.current_stock,
            "Stock Mínimo": p.min_stock,
            "Inversión en Stock ($)": p.current_stock * p.cost_price,
            "Estado": "SIN STOCK" if p.current_stock <= 0 else ("STOCK BAJO" if p.current_stock <= p.min_stock else "NORMAL")
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Inventario")
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=reporte_inventario_kiosco.xlsx"}
    )

@router.get("/stock/pdf")
def export_stock_pdf(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    products = db.query(Product).filter(Product.is_active == True).order_by(Product.name.asc()).all()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Reporte de Inventario de Stock - Kiosco", styles['Title']))
    story.append(Spacer(1, 12))

    table_data = [["Producto", "Categoría", "Costo ($)", "Venta ($)", "Stock", "Estado"]]
    for p in products:
        status_text = "AGOTADO" if p.current_stock <= 0 else ("REPONER" if p.current_stock <= p.min_stock else "NORMAL")
        table_data.append([
            p.name,
            p.category.name if p.category else "",
            f"${p.cost_price}",
            f"${p.sale_price}",
            f"{p.current_stock} u.",
            status_text
        ])

    t = Table(table_data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
    ]))
    story.append(t)
    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reporte_inventario_kiosco.pdf"}
    )

@router.get("/purchases/excel")
def export_purchases_excel(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    purchases = db.query(Purchase).order_by(Purchase.created_at.desc()).all()
    data = []
    for p in purchases:
        data.append({
            "ID Compra": p.id,
            "Fecha y Hora": p.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "Registrado Por": p.user.full_name if p.user else "",
            "Total Compra ($)": p.total_amount
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Compras")
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=reporte_compras_kiosco.xlsx"}
    )

@router.get("/purchases/pdf")
def export_purchases_pdf(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    purchases = db.query(Purchase).order_by(Purchase.created_at.desc()).all()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Reporte de Compras y Reposiciones - Kiosco", styles['Title']))
    story.append(Spacer(1, 12))

    table_data = [["ID", "Fecha", "Registrado Por", "Total ($)"]]
    for p in purchases:
        table_data.append([
            f"#{p.id}",
            p.created_at.strftime("%Y-%m-%d"),
            p.user.full_name if p.user else "",
            f"${p.total_amount}"
        ])

    t = Table(table_data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
    ]))
    story.append(t)
    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reporte_compras_kiosco.pdf"}
    )
