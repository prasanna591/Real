from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import BuilderUser

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_builder(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> BuilderUser:
    credentials_error = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_error
    try:
        builder_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise credentials_error
    builder = db.get(BuilderUser, builder_id)
    if not builder:
        raise credentials_error
    return builder


CurrentBuilder = Annotated[BuilderUser, Depends(get_current_builder)]
