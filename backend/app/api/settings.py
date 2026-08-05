from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.entities import StoreSettings, User
from app.schemas.dtos import SettingsSchema

router = APIRouter(prefix="/settings", tags=["Configuración"])

@router.get("", response_model=SettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(StoreSettings).first()
    if not settings:
        settings = StoreSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=SettingsSchema)
def update_settings(data: SettingsSchema, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    settings = db.query(StoreSettings).first()
    if not settings:
        settings = StoreSettings()
        db.add(settings)

    settings.store_name = data.store_name
    settings.tax_id = data.tax_id
    settings.logo_url = data.logo_url
    settings.currency_symbol = data.currency_symbol
    settings.address = data.address
    settings.phone = data.phone
    settings.receipt_footer_note = data.receipt_footer_note
    settings.dark_mode_default = data.dark_mode_default

    db.commit()
    db.refresh(settings)
    return settings
