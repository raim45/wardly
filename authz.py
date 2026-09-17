"""The authorization layer. This is the core of the project.

The rule table and the reasoning behind it live in AUTHORIZATION.md, which
reconciles `authorization_layer.pdf` with this code. Keep the two in sync —
ROLE_RECORD_ACCESS below is the executable copy.
"""

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select

from models import Assignment

# The four checks, in the order the PDF specifies them.
CHECKS = ("authenticated", "role", "ward", "assignment")

# Role -> the record types that role may ever see. See AUTHORIZATION.md.
#
# Note `admin` is empty on purpose. The PDF scopes Admin/IT to "account and
# system logs" and says it cannot see patient clinical content — so an admin's
# access lives entirely in the audit log, not in the records tables. Its patient
# list renders empty, which is the correct behaviour, not a bug.
ROLE_RECORD_ACCESS = {
    "doctor": frozenset({"note", "result", "prescription", "admin_info"}),
    "nurse": frozenset({"note", "prescription"}),
    "lab_staff": frozenset({"result"}),
    "records_clerk": frozenset({"admin_info"}),
    "admin": frozenset(),
}


@dataclass(frozen=True)
class Decision:
    """Why an access check came out the way it did.

    `failed_check` is the structured answer the PDF asks this layer to hand the
    audit log: which of the four checks refused. `reason` is the sentence shown
    to a human.
    """

    allowed: bool
    failed_check: Optional[str]  # None when allowed
    reason: str

    @property
    def layer(self) -> Optional[str]:
        """Which gate produced the answer.

        Lets the API distinguish "you may not open this patient at all" from
        "this one record is not yours to read" — the former is a 403, the
        latter renders as a visible restricted section.
        """
        if self.allowed:
            return None
        return "record" if self.failed_check == "role" else "patient"


def visible_record_types(role: str) -> frozenset:
    """Every record type this role can see, across all patients."""
    return ROLE_RECORD_ACCESS.get(role, frozenset())


def role_may_see(role: str, record_type: str) -> bool:
    """Check 2: does this role ever get to see this record type?"""
    return record_type in ROLE_RECORD_ACCESS.get(role, frozenset())


def assigned_patient_ids(db, user) -> set[int]:
    """Check 4, resolved once for all patients. One query, not N."""
    return set(db.scalars(select(Assignment.patient_id).where(Assignment.user_id == user.id)))


def patient_gate(user, patient, assigned_ids) -> Decision:
    """Checks 1, 3 and 4 — everything that is about the *patient*, not the record."""
    if user is None:
        return Decision(False, "authenticated", "not logged in")

    if patient.ward != user.ward:
        return Decision(
            False,
            "ward",
            f"patient is in {patient.ward}; you are in {user.ward or 'no ward'}",
        )

    if patient.id not in assigned_ids:
        return Decision(False, "assignment", "you are not assigned to this patient")

    return Decision(True, None, "ward and assignment both match")


def record_gate(user, record_type: str) -> Decision:
    """Check 2 — about the *record*, independent of which patient it belongs to."""
    if not role_may_see(user.role, record_type):
        return Decision(
            False,
            "role",
            f"role '{user.role}' may not see '{record_type}' records",
        )
    return Decision(True, None, f"role '{user.role}' may see '{record_type}' records")


def access_decision(db, user, patient, record_type: str, assigned_ids=None) -> Decision:
    """All four checks, in order, reporting the first that fails."""
    if assigned_ids is None:
        assigned_ids = assigned_patient_ids(db, user) if user else set()

    patient_result = patient_gate(user, patient, assigned_ids)
    if not patient_result.allowed:
        return patient_result

    return record_gate(user, record_type)


def can_access(db, user, patient, record_type: str) -> bool:
    """The core question: may this user see this record type for this patient?

    True only if all four checks pass. Prefer `access_decision` when you also
    need to know which check said no.
    """
    return access_decision(db, user, patient, record_type).allowed
