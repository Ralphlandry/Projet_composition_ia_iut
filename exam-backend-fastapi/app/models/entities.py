from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def uuid_str() -> str:
    return str(uuid.uuid4())


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserRole(Base):
    __tablename__ = "user_roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="etudiant")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    student_number: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    level_id: Mapped[str] = mapped_column(String(36), ForeignKey("levels.id", ondelete="RESTRICT"), nullable=False, index=True)
    specialty_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Specialty(Base):
    __tablename__ = "specialties"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    allowed_subject_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Level(Base):
    __tablename__ = "levels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Class(Base):
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    level_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("levels.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ClassStudent(Base):
    __tablename__ = "class_students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    class_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(64), nullable=False, default="qcm")
    options: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    points: Mapped[float | None] = mapped_column(Float, nullable=True, default=1.0)
    difficulty: Mapped[str | None] = mapped_column(String(64), nullable=True, default="moyen")
    subject_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    class_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    subject_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    specialty_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("specialties.id", ondelete="SET NULL"), nullable=True)
    level_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("levels.id", ondelete="SET NULL"), nullable=True)
    evaluation_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(32), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True, default=60)
    total_points: Mapped[float | None] = mapped_column(Float, nullable=True, default=20)
    status: Mapped[str | None] = mapped_column(String(64), nullable=True, default="brouillon")
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ExamPart(Base):
    __tablename__ = "exam_parts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    exam_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    user_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(16), nullable=False)          # insert | update | delete
    table_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    row_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    changes: Mapped[str | None] = mapped_column(Text, nullable=True)         # JSON string
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    exam_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), nullable=True, index=True)
    part_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("exam_parts.id", ondelete="SET NULL"), nullable=True, index=True)
    question_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=True)
    order_index: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    points: Mapped[float | None] = mapped_column(Float, nullable=True)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    exam_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(64), nullable=True, default="en_cours")
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    graded_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    incidents: Mapped[str | None] = mapped_column(Text, nullable=True)


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    submission_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=True, index=True)
    question_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    points_awarded: Mapped[float | None] = mapped_column(Float, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str | None] = mapped_column(String(64), nullable=True, default="info")
    is_read: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
