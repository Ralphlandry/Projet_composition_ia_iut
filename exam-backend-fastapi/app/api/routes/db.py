from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Answer, Exam, ExamQuestion, Notification, Profile, Specialty, StudentProfile, Submission
from app.schemas import DBDeleteIn, DBInsertIn, DBQueryIn, DBUpdateIn
from app.services.db_ops import (
    DATETIME_COLUMNS,
    TABLE_MODELS,
    apply_filters,
    count_query,
    get_student_profile,
    get_user_role,
    hydrate_related,
    parse_datetime,
    serialize_row,
)

router = APIRouter(prefix="/api/db", tags=["db"])


def _student_exam_scope(db: Session, user_id: str):
    student_profile = get_student_profile(db, user_id)
    if not student_profile:
        return None

    specialty = db.query(Specialty).filter(Specialty.id == student_profile.specialty_id).first()
    if not specialty:
        return None

    allowed_subject_ids = specialty.allowed_subject_ids or []
    if not isinstance(allowed_subject_ids, list) or not allowed_subject_ids:
        return None

    return db.query(Exam.id).filter(
        Exam.status == "publie",
        Exam.level_id == student_profile.level_id,
        Exam.specialty_id == student_profile.specialty_id,
        Exam.subject_id.in_(allowed_subject_ids),
    )


def _ensure_exam_allowed_for_student(db: Session, user_id: str, exam_id: str) -> bool:
    scoped = _student_exam_scope(db, user_id)
    if not scoped:
        return False
    return scoped.filter(Exam.id == exam_id).first() is not None


@router.post("/query")
def db_query(
    payload: DBQueryIn,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    model = TABLE_MODELS.get(payload.table)
    if not model:
        raise HTTPException(status_code=400, detail="Table non supportée")

    current_role = get_user_role(db, current_user.id)

    # Auto-publier les épreuves programmées dont l'heure de début est arrivée
    if payload.table == "exams":
        now_local = datetime.now()
        pending = db.query(Exam).filter(Exam.status == "programme", Exam.start_date != None, Exam.start_date <= now_local).all()
        if pending:
            for exam_row in pending:
                exam_row.status = "publie"
                # Notifier tous les étudiants concernés
                if exam_row.specialty_id and exam_row.level_id:
                    students = db.query(StudentProfile).filter(
                        StudentProfile.specialty_id == exam_row.specialty_id,
                        StudentProfile.level_id == exam_row.level_id,
                    ).all()
                    for sp in students:
                        db.add(Notification(
                            id=str(uuid.uuid4()),
                            user_id=sp.user_id,
                            title="Nouvelle épreuve disponible",
                            message=f"L'épreuve « {exam_row.title} » est maintenant ouverte. Bonne chance !",
                            type="info",
                            is_read=False,
                        ))
            db.commit()

    query = db.query(model)
    query = apply_filters(query, model, payload.filters)

    if current_role == "etudiant":
        if payload.table == "exams":
            scoped = _student_exam_scope(db, current_user.id)
            if not scoped:
                return {"data": [] if not payload.single and not payload.maybe_single else None, "error": None}
            allowed_exam_ids = [row[0] for row in scoped.all()]
            if not allowed_exam_ids:
                return {"data": [] if not payload.single and not payload.maybe_single else None, "error": None}
            query = query.filter(Exam.id.in_(allowed_exam_ids))
        elif payload.table == "exam_questions":
            scoped = _student_exam_scope(db, current_user.id)
            if not scoped:
                return {"data": [] if not payload.single and not payload.maybe_single else None, "error": None}
            allowed_exam_ids = [row[0] for row in scoped.all()]
            if not allowed_exam_ids:
                return {"data": [] if not payload.single and not payload.maybe_single else None, "error": None}
            query = query.filter(ExamQuestion.exam_id.in_(allowed_exam_ids))
        elif payload.table == "submissions":
            query = query.filter(Submission.student_id == current_user.id)
        elif payload.table == "answers":
            query = query.join(Submission, Answer.submission_id == Submission.id).filter(Submission.student_id == current_user.id)
        elif payload.table == "profiles":
            query = query.filter(Profile.id == current_user.id)
        elif payload.table == "user_roles":
            query = query.filter(model.user_id == current_user.id)
        elif payload.table == "student_profiles":
            query = query.filter(model.user_id == current_user.id)
        elif payload.table == "notifications":
            query = query.filter(model.user_id == current_user.id)
        elif payload.table in {"classes", "class_students", "questions"}:
            raise HTTPException(status_code=403, detail="Accès refusé à cette ressource")

    # Isolation professeur : ne voir que ses propres examens et ressources associées
    elif current_role == "professeur":
        if payload.table == "exams":
            query = query.filter(Exam.created_by == current_user.id)
        elif payload.table == "exam_questions":
            prof_exam_ids = [r[0] for r in db.query(Exam.id).filter(Exam.created_by == current_user.id).all()]
            if not prof_exam_ids:
                return {"data": [] if not payload.single and not payload.maybe_single else None, "error": None}
            query = query.filter(ExamQuestion.exam_id.in_(prof_exam_ids))
        elif payload.table == "submissions":
            prof_exam_ids = [r[0] for r in db.query(Exam.id).filter(Exam.created_by == current_user.id).all()]
            query = query.filter(Submission.exam_id.in_(prof_exam_ids))

    if payload.count == "exact" and payload.head:
        return {"data": None, "count": count_query(query), "error": None}

    if payload.order and hasattr(model, payload.order.column):
        column = getattr(model, payload.order.column)
        query = query.order_by(asc(column) if payload.order.ascending else desc(column))

    if payload.limit:
        query = query.limit(payload.limit)

    rows = [serialize_row(row) for row in query.all()]
    rows = hydrate_related(db, payload.table, rows)

    # Sécurité anti-triche : masquer la bonne réponse pendant la passation de l'examen.
    # La table "answers" (consultation des résultats) conserve correct_answer intentionnellement.
    if current_role == "etudiant" and payload.table == "exam_questions":
        for row in rows:
            if isinstance(row.get("question"), dict):
                row["question"].pop("correct_answer", None)

    if payload.single:
        if not rows:
            return {"data": None, "error": {"message": "No rows"}}
        return {"data": rows[0], "error": None}

    if payload.maybe_single:
        return {"data": rows[0] if rows else None, "error": None}

    return {"data": rows, "error": None}


@router.post("/insert")
def db_insert(
    payload: DBInsertIn,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    model = TABLE_MODELS.get(payload.table)
    if not model:
        raise HTTPException(status_code=400, detail="Table non supportée")

    current_role = get_user_role(db, current_user.id)
    if current_role == "etudiant" and payload.table not in {"submissions", "answers"}:
        raise HTTPException(status_code=403, detail="Accès refusé à cette ressource")

    rows_input = payload.data if isinstance(payload.data, list) else [payload.data]
    created_rows = []

    for raw in rows_input:
        data = dict(raw)
        data.setdefault("id", str(uuid.uuid4()))

        # Convert ISO datetime strings to Python datetime objects
        dt_cols = DATETIME_COLUMNS.get(payload.table, set())
        for col in dt_cols:
            if col in data:
                data[col] = parse_datetime(data[col])

        if current_role == "etudiant" and payload.table == "submissions":
            exam_id = data.get("exam_id")
            if not exam_id or not _ensure_exam_allowed_for_student(db, current_user.id, exam_id):
                raise HTTPException(status_code=403, detail="Épreuve non autorisée pour votre profil")
            # Allowlist strict : l'étudiant ne peut pas se fixer un score ou un statut corrigé
            _SUBMISSION_INSERT_ALLOWED = {"id", "exam_id", "student_id", "started_at"}
            data = {k: v for k, v in data.items() if k in _SUBMISSION_INSERT_ALLOWED}
            data["student_id"] = current_user.id
            data["status"] = "en_cours"
            data["score"] = None

        if current_role == "etudiant" and payload.table == "answers":
            submission_id = data.get("submission_id")
            if not submission_id:
                raise HTTPException(status_code=400, detail="submission_id requis")
            owned_submission = (
                db.query(Submission)
                .filter(Submission.id == submission_id, Submission.student_id == current_user.id)
                .first()
            )
            if not owned_submission:
                raise HTTPException(status_code=403, detail="Soumission non autorisée")
            # Allowlist strict : l'étudiant ne peut pas s'attribuer des points
            _ANSWER_INSERT_ALLOWED = {"id", "submission_id", "question_id", "answer_text"}
            data = {k: v for k, v in data.items() if k in _ANSWER_INSERT_ALLOWED}

        obj = model(**data)
        db.add(obj)
        db.flush()
        created_rows.append(serialize_row(obj))

    db.commit()
    created_rows = hydrate_related(db, payload.table, created_rows)
    return {"data": created_rows, "error": None}


@router.post("/update")
def db_update(
    payload: DBUpdateIn,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    model = TABLE_MODELS.get(payload.table)
    if not model:
        raise HTTPException(status_code=400, detail="Table non supportée")

    current_role = get_user_role(db, current_user.id)
    if current_role == "etudiant" and payload.table not in {"submissions", "answers", "notifications"}:
        raise HTTPException(status_code=403, detail="Accès refusé à cette ressource")

    query = db.query(model)
    query = apply_filters(query, model, payload.filters)

    if current_role == "etudiant" and payload.table == "notifications":
        query = query.filter(model.user_id == current_user.id)

    if current_role == "etudiant" and payload.table == "submissions":
        query = query.filter(Submission.student_id == current_user.id)

    if current_role == "etudiant" and payload.table == "answers":
        query = query.join(Submission, Answer.submission_id == Submission.id).filter(Submission.student_id == current_user.id)

    # Isolation professeur : ne modifier que ses propres ressources
    if current_role == "professeur":
        if payload.table == "exams":
            query = query.filter(Exam.created_by == current_user.id)
        elif payload.table == "exam_questions":
            prof_exam_ids = [r[0] for r in db.query(Exam.id).filter(Exam.created_by == current_user.id).all()]
            query = query.filter(ExamQuestion.exam_id.in_(prof_exam_ids))
        elif payload.table == "submissions":
            prof_exam_ids = [r[0] for r in db.query(Exam.id).filter(Exam.created_by == current_user.id).all()]
            query = query.filter(Submission.exam_id.in_(prof_exam_ids))

    rows = query.all()

    # Convert ISO datetime strings to Python datetime objects
    dt_cols = DATETIME_COLUMNS.get(payload.table, set())
    parsed_data = dict(payload.data)
    for col in dt_cols:
        if col in parsed_data:
            parsed_data[col] = parse_datetime(parsed_data[col])

    # Allowlist strict pour les étudiants — empêche l'auto-notation
    if current_role == "etudiant":
        if payload.table == "submissions":
            # Champs autorisés : status (soumission) + incidents (journal réseau anti-triche)
            parsed_data = {k: v for k, v in parsed_data.items() if k in {"status", "incidents"}}
            if "status" in parsed_data and parsed_data["status"] not in {"en_cours", "soumis"}:
                raise HTTPException(status_code=403, detail="Modification de statut non autorisée")
        elif payload.table == "answers":
            parsed_data = {k: v for k, v in parsed_data.items() if k in {"answer_text"}}
        elif payload.table == "notifications":
            parsed_data = {k: v for k, v in parsed_data.items() if k in {"is_read"}}

    for row in rows:
        for key, value in parsed_data.items():
            if hasattr(row, key):
                setattr(row, key, value)

        if payload.table == "answers" and not (getattr(row, "answer_text", "") or "").strip():
            # Business rule: blank answer cannot receive points.
            setattr(row, "points_awarded", 0.0)

        if hasattr(row, "updated_at"):
            setattr(row, "updated_at", datetime.utcnow())

    db.commit()

    # Notifier l'étudiant quand sa note est définitive
    if payload.table == "submissions" and payload.data.get("status") == "corrige":
        for row in rows:
            if row.student_id:
                # Récupérer le titre de l'épreuve
                exam_title = ""
                if row.exam_id:
                    exam_obj = db.query(Exam).filter(Exam.id == row.exam_id).first()
                    exam_title = f"« {exam_obj.title} » " if exam_obj else ""
                score_str = f"{row.score:.1f}" if row.score is not None else "?"
                db.add(Notification(
                    id=str(uuid.uuid4()),
                    user_id=row.student_id,
                    title="Votre note est définitive",
                    message=f"La correction de votre épreuve {exam_title}a été validée par votre enseignant. Note finale : {score_str}.",
                    type="success",
                    is_read=False,
                ))
        db.commit()

    updated = [serialize_row(r) for r in rows]
    updated = hydrate_related(db, payload.table, updated)
    return {"data": updated, "error": None}


@router.post("/delete")
def db_delete(
    payload: DBDeleteIn,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    model = TABLE_MODELS.get(payload.table)
    if not model:
        raise HTTPException(status_code=400, detail="Table non supportée")

    current_role = get_user_role(db, current_user.id)
    if current_role == "etudiant" and payload.table not in {"answers", "notifications"}:
        raise HTTPException(status_code=403, detail="Accès refusé à cette ressource")

    query = db.query(model)
    query = apply_filters(query, model, payload.filters)

    # Isolation professeur : ne supprimer que ses propres ressources
    if current_role == "professeur":
        if payload.table == "exams":
            query = query.filter(Exam.created_by == current_user.id)
        elif payload.table == "exam_questions":
            prof_exam_ids = [r[0] for r in db.query(Exam.id).filter(Exam.created_by == current_user.id).all()]
            query = query.filter(ExamQuestion.exam_id.in_(prof_exam_ids))

    if current_role == "etudiant" and payload.table == "notifications":
        query = query.filter(model.user_id == current_user.id)
        count = query.count()
        query.delete(synchronize_session=False)
        db.commit()
        return {"data": {"deleted": count}, "error": None}

    if current_role == "etudiant" and payload.table == "answers":
        # SQLAlchemy forbids bulk delete on joined queries. Resolve allowed ids first.
        answer_ids = [
            row[0]
            for row in query
            .join(Submission, Answer.submission_id == Submission.id)
            .filter(Submission.student_id == current_user.id)
            .with_entities(Answer.id)
            .all()
        ]
        if not answer_ids:
            return {"data": {"deleted": 0}, "error": None}

        count = db.query(Answer).filter(Answer.id.in_(answer_ids)).count()
        db.query(Answer).filter(Answer.id.in_(answer_ids)).delete(synchronize_session=False)
        db.commit()
        return {"data": {"deleted": count}, "error": None}

    count = query.count()
    query.delete(synchronize_session=False)
    db.commit()

    return {"data": {"deleted": count}, "error": None}
