from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_active_user
from app.schemas.report import ReportCreate, ReportOut
from app.services.reports import create_report, to_report_out


router = APIRouter()


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def create_report_endpoint(
    payload: ReportCreate,
    current_user: dict = Depends(require_active_user),
) -> ReportOut:
    try:
        report = await create_report(payload, current_user)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None

    return to_report_out(report)
