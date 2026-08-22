from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentBuilder
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models import BuilderRole, BuilderUser
from app.schemas import BuilderLogin, BuilderRead, BuilderRegister, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=BuilderRead, status_code=status.HTTP_201_CREATED)
def register_builder(payload: BuilderRegister, db: Session = Depends(get_db)):
    if db.scalar(select(BuilderUser).where(BuilderUser.email == payload.email.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    builder = BuilderUser(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=BuilderRole.BUILDER,
    )
    db.add(builder)
    db.commit()
    db.refresh(builder)
    return builder


@router.post("/login", response_model=TokenResponse)
def login(payload: BuilderLogin, db: Session = Depends(get_db)):
    builder = db.scalar(select(BuilderUser).where(BuilderUser.email == payload.email.lower()))
    if not builder or not verify_password(payload.password, builder.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return TokenResponse(access_token=create_access_token(str(builder.id), str(builder.role)))


@router.get("/me", response_model=BuilderRead)
def me(builder: CurrentBuilder):
    return builder
