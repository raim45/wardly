"""SQLAlchemy models. These are the single source of truth for the schema —
the database is created from them by `seed.py`, so there is no separate .sql
file to drift out of sync."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func

from db import Base

# Kept here so seed.py and authz.py validate against the same lists.
ROLES = ("doctor", "nurse", "lab_staff", "records_clerk", "admin")
RECORD_TYPES = ("note", "result", "prescription", "admin_info")
ACTIONS = ("view_granted", "view_denied", "emergency_override")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    username = Column(String(60), unique=True, nullable=False)
    password = Column(String(120), nullable=False)  # plaintext: prototype only
    role = Column(String(20), nullable=False)
    ward = Column(String(40))

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    ward = Column(String(40), nullable=False)
    is_admitted = Column(Boolean, nullable=False, default=True)

    def __repr__(self):
        return f"<Patient {self.name} ({self.ward})>"


class Assignment(Base):
    """Links a user to a patient they are currently responsible for."""

    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)


class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)


class AccessLog(Base):
    """Append-only. Every authorization decision lands here, granted or denied."""

    __tablename__ = "access_log"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    action = Column(String(30), nullable=False)

    # Which of the four checks refused, as a structured value the audit log can
    # group and filter on. NULL when access was granted. See authz.CHECKS.
    failed_check = Column(String(20), nullable=True)

    # Overrides only, per v1's schema — a denial's explanation lives in
    # failed_check, not here.
    reason = Column(Text)

    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
