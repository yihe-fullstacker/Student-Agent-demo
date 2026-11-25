from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.db.database import get_db
from app.db.models import User

bearer_scheme = HTTPBearer(auto_error=False)

UNAUTHORIZED_DETAIL = "请先登录后再操作"


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve and validate the authenticated User from the Bearer JWT token."""
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(status_code=401, detail=UNAUTHORIZED_DETAIL)

    try:
        payload = decode_access_token(credentials.credentials)
        sub = payload.get("sub")
        user_id = int(sub)
    except (PyJWTError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail=UNAUTHORIZED_DETAIL) from exc

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail=UNAUTHORIZED_DETAIL)

    return user
