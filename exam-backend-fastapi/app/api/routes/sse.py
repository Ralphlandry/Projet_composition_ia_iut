"""Server-Sent Events endpoint for real-time notifications."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import Notification, Profile

router = APIRouter(prefix="/api/sse", tags=["sse"])


def _get_user_from_token(token: str, db: Session) -> Profile:
    """Validate JWT passed as query param (EventSource can't send headers)."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide")
    user = db.query(Profile).filter(Profile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


@router.get("/notifications")
async def stream_notifications(
    request: Request,
    token: str = Query(..., description="JWT token"),
    db: Session = Depends(get_db),
):
    """SSE stream that pushes new notification count every few seconds."""
    user = _get_user_from_token(token, db)
    user_id = user.id

    async def event_generator():
        last_count = -1
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            # Query unread count
            try:
                count = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id == user_id,
                        Notification.is_read == False,  # noqa: E712
                    )
                    .count()
                )
            except Exception:
                # DB session may have been invalidated; stop cleanly
                break

            # Only send event when count changes
            if count != last_count:
                last_count = count
                data = json.dumps({"unreadCount": count, "ts": datetime.utcnow().isoformat()})
                yield f"data: {data}\n\n"

            await asyncio.sleep(5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
