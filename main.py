"""FastAPI app: auth, patient list, patient detail, emergency override, audit log.

Run with:  uvicorn main:app --reload
Then open: http://127.0.0.1:8000/docs      (auto-generated API docs)

This process serves the API only. The UI is the React app in `frontend/`, which
runs on its own dev server — see README.md for how to start both.

Login state lives in the browser's localStorage and travels as an X-User-Id
header, per README.md. That is trivially forgeable and is fine for a prototype;
it is not authentication.
"""

from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

import authz
from db import get_db
from models import RECORD_TYPES, AccessLog, Patient, Record, User

app = FastAPI(title="Patient Records Authorization Demo")


# --------------------------------------------------------------------------
# Request/response shapes
# --------------------------------------------------------------------------


class LoginRequest(BaseModel):
    username: str
    password: str


class OverrideRequest(BaseModel):
    # The PDF specifies "a one-line reason typed in at the time". The UI caps the
    # input at 200 characters; this makes the API enforce the same bound, so a
    # direct call cannot write unbounded text into an append-only log.
    # A blank-but-present reason is still a 400 (see the endpoint), not a 422.
    reason: str = Field(max_length=200)


def user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "role": user.role,
        "ward": user.ward,
    }


def patient_payload(patient: Patient) -> dict:
    return {
        "id": patient.id,
        "name": patient.name,
        "ward": patient.ward,
        "is_admitted": patient.is_admitted,
    }


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------


def current_user(
    x_user_id: Optional[int] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if x_user_id is None:
        raise HTTPException(status_code=401, detail="Not logged in")
    user = db.get(User, x_user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user — please log in again")
    return user


@app.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if user is None or user.password != body.password:
        # Same message either way: do not reveal which usernames exist.
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user_payload(user)


# --------------------------------------------------------------------------
# Patients
# --------------------------------------------------------------------------


@app.get("/patients")
def list_patients(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Patients in the user's ward, each flagged with whether they are assigned.

    Ward-scoped rather than assignment-scoped, so the screen can show the
    difference between the two checks: a patient in your ward you are *not*
    assigned to still appears in the list, and opening them is refused. That is
    the assignment check being visible rather than mysterious.

    A role that can see no record type at all gets an empty list instead of a
    ward's worth of patients whose every section would be restricted — which is
    the position `admin` is in, since its access is the audit log.
    """
    if not authz.visible_record_types(user.role):
        return []

    assigned = authz.assigned_patient_ids(db, user)
    patients = db.scalars(
        select(Patient).where(Patient.ward == user.ward).order_by(Patient.name)
    ).all()
    return [
        {**patient_payload(p), "assigned": p.id in assigned}
        for p in patients
    ]


def _log(db: Session, user: User, patient: Patient, action: str,
         failed_check: Optional[str] = None, reason: Optional[str] = None):
    db.add(
        AccessLog(
            user_id=user.id if user else None,
            patient_id=patient.id if patient else None,
            action=action,
            failed_check=failed_check,
            reason=reason,
        )
    )


def _detail_payload(records: list[Record], decide):
    """Shared shape for both the normal view and the override view.

    Denied records keep their type but never their content — the UI needs to
    know a row is restricted, and which check restricted it, in order to draw
    the restricted card. Nothing more than that is exposed.
    """
    entries = []
    for record in records:
        decision = decide(record)
        entry = {
            "id": record.id,
            "type": record.type,
            "allowed": decision.allowed,
            "failed_check": decision.failed_check,
        }
        if decision.allowed:
            entry["content"] = record.content
            entry["restricted_reason"] = None
        else:
            entry["content"] = None
            entry["restricted_reason"] = decision.reason
        entries.append(entry)
    return entries


@app.get("/patients/{patient_id}")
def get_patient(
    patient_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Full patient detail. Every record check is logged, granted or denied."""
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="No such patient")

    assigned = authz.assigned_patient_ids(db, user)
    gate = authz.patient_gate(user, patient, assigned)
    if not gate.allowed:
        # Ward or assignment failed: this user may not open this patient at all.
        _log(db, user, patient, "view_denied", failed_check=gate.failed_check)
        db.commit()
        raise HTTPException(status_code=403, detail=gate.reason)

    records = db.scalars(
        select(Record).where(Record.patient_id == patient.id).order_by(Record.id)
    ).all()

    records_payload = _detail_payload(records, lambda r: authz.record_gate(user, r.type))

    # One row per access attempt, not one per record.
    #
    # Opening a four-record patient is a single event. Logging it four times
    # filled the audit screen with near-duplicates of the same instant and made
    # it unreadable, which is the opposite of what that screen is for. Which
    # record types the role table includes is a filtering decision, not a
    # separate access attempt — no one asked for the withheld rows, so there is
    # no access to record.
    _log(db, user, patient, "view_granted")
    db.commit()

    return {
        "patient": patient_payload(patient),
        "records": records_payload,
        "override": False,
        "override_reason": None,
    }


@app.post("/patients/{patient_id}/override")
def emergency_override(
    patient_id: int,
    body: OverrideRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Emergency access: skips the ward and assignment checks, keeps the role
    gate, and always logs `emergency_override` with the reason."""
    reason = body.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="An override requires a reason")

    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="No such patient")

    entry = AccessLog(
        user_id=user.id,
        patient_id=patient.id,
        action="emergency_override",
        reason=reason,
    )
    db.add(entry)
    db.commit()
    # Read the row back so the timestamp the UI shows is the same one the audit
    # log stored, rather than the browser's own clock.
    db.refresh(entry)

    records = db.scalars(
        select(Record).where(Record.patient_id == patient.id).order_by(Record.id)
    ).all()

    return {
        "patient": patient_payload(patient),
        "records": _detail_payload(records, lambda r: authz.record_gate(user, r.type)),
        "override": True,
        "override_reason": reason,
        "override_logged_at": entry.timestamp.isoformat(),
    }


# --------------------------------------------------------------------------
# Audit log
# --------------------------------------------------------------------------


@app.get("/audit-log")
def audit_log(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """The whole access_log, newest first. Admin only."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only an admin may read the audit log")

    rows = db.execute(
        select(AccessLog, User.name, User.role, Patient.name)
        .outerjoin(User, AccessLog.user_id == User.id)
        .outerjoin(Patient, AccessLog.patient_id == Patient.id)
        .order_by(desc(AccessLog.timestamp), desc(AccessLog.id))
    ).all()

    return [
        {
            "id": log.id,
            "user_name": user_name or "—",
            "user_role": user_role or "—",
            "patient_name": patient_name or "—",
            "action": log.action,
            "failed_check": log.failed_check,
            "reason": log.reason,
            "timestamp": log.timestamp.isoformat(),
        }
        for log, user_name, user_role, patient_name in rows
    ]
