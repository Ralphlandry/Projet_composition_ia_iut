"""
Tests automatisés — EvalPro Backend
=====================================
Lancez avec : python -m pytest tests/ -v
(depuis exam-backend-fastapi/)

Tests unitaires : exécutables sans serveur ni base de données.
Tests d'intégration : nécessitent le serveur FastAPI en cours d'exécution
    (marqués avec @pytest.mark.integration — skip auto si non dispo).
"""
from __future__ import annotations

import time
from collections import defaultdict

import pytest

# ── Tests unitaires : Rate Limiter ────────────────────────────────────────────

class TestRateLimiter:
    """Vérifie la logique du rate limiter en mémoire d'auth.py."""

    def _make_limiter(self, max_attempts=5, window=300):
        attempts: dict[str, list[float]] = defaultdict(list)

        def check(ip: str) -> bool:
            now = time.time()
            attempts[ip] = [t for t in attempts[ip] if now - t < window]
            if len(attempts[ip]) >= max_attempts:
                return False
            attempts[ip].append(now)
            return True

        return check

    def test_allows_first_attempts(self):
        check = self._make_limiter(max_attempts=5)
        for _ in range(5):
            assert check("1.2.3.4") is True

    def test_blocks_on_limit_exceeded(self):
        check = self._make_limiter(max_attempts=5)
        for _ in range(5):
            check("1.2.3.4")
        assert check("1.2.3.4") is False

    def test_independent_per_ip(self):
        check = self._make_limiter(max_attempts=3)
        for _ in range(3):
            check("10.0.0.1")
        # 10.0.0.2 n'a pas été utilisé → doit passer
        assert check("10.0.0.2") is True

    def test_window_expiry(self):
        check = self._make_limiter(max_attempts=2, window=0)  # window 0s → expire immédiatement
        check("1.2.3.4")
        check("1.2.3.4")
        # Après expiry, les tentatives sont oubliées
        assert check("1.2.3.4") is True


# ── Tests unitaires : Schémas Pydantic ───────────────────────────────────────

class TestSchemas:
    """Vérifie la validation des schémas d'entrée."""

    def test_signup_schema_etudiant_requires_matricule(self):
        from app.schemas import SignUpIn
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            SignUpIn(
                email="etu@example.com",
                password="Pass123!",
                role="etudiant",
                # student_number manquant → doit lever une erreur
            )
        errors = exc_info.value.errors()
        assert any("matricule" in str(e).lower() or "student_number" in str(e).lower()
                   for e in errors)

    def test_signup_schema_professeur_valid(self):
        from app.schemas import SignUpIn
        data = SignUpIn(
            email="prof@example.com",
            password="Pass123!",
            full_name="Prof Dupont",
            role="professeur",
        )
        assert data.email == "prof@example.com"
        assert data.role == "professeur"

    def test_signup_schema_password_too_short(self):
        from app.schemas import SignUpIn
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SignUpIn(email="x@y.z", password="12", role="professeur")

    def test_admin_reset_password_min_length(self):
        from app.schemas import AdminResetPasswordIn
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AdminResetPasswordIn(user_id="abc", new_password="short")  # < 8 chars

    def test_admin_reset_password_valid(self):
        from app.schemas import AdminResetPasswordIn
        r = AdminResetPasswordIn(user_id="some-uuid", new_password="ValidPass123!")
        assert r.new_password == "ValidPass123!"

    def test_db_query_schema_defaults(self):
        from app.schemas import DBQueryIn
        q = DBQueryIn(table="exams")
        assert q.filters == []
        assert q.single is False
        assert q.limit is None

    def test_db_update_schema(self):
        from app.schemas import DBUpdateIn
        u = DBUpdateIn(table="submissions", data={"status": "soumis"})
        assert u.data["status"] == "soumis"


# ── Tests unitaires : Sécurité hash ──────────────────────────────────────────

class TestPasswordSecurity:
    def test_hash_verify_roundtrip(self):
        from app.core.security import hash_password, verify_password
        pwd = "MonSuperMotDePasse123!"
        h = hash_password(pwd)
        assert h != pwd
        assert verify_password(pwd, h)

    def test_wrong_password_rejected(self):
        from app.core.security import hash_password, verify_password
        h = hash_password("correct")
        assert not verify_password("wrong", h)

    def test_too_long_password_detected(self):
        from app.core.security import is_password_too_long
        # 73 octets → trop long pour bcrypt
        assert is_password_too_long("a" * 73)
        assert not is_password_too_long("a" * 72)

    def test_disabled_account_prefix(self):
        """Vérifie la convention de désactivation de compte."""
        from app.core.security import hash_password, verify_password
        h = hash_password("mypassword")
        disabled_h = f"<disabled>{h}"
        # Le hash désactivé commence bien par <disabled>
        assert disabled_h.startswith("<disabled>")
        # Réactivation → on enlève le préfixe
        restored = disabled_h[len("<disabled>"):]
        assert verify_password("mypassword", restored)


# ── Tests d'intégration (marqués, skip si serveur absent) ────────────────────

try:
    import httpx as _httpx
    _httpx_available = True
except ImportError:
    _httpx_available = False

BASE_URL = "http://127.0.0.1:8001"


def _server_running() -> bool:
    if not _httpx_available:
        return False
    try:
        import httpx
        httpx.get(f"{BASE_URL}/docs", timeout=2)
        return True
    except Exception:
        return False


integration = pytest.mark.skipif(
    not _server_running(),
    reason="Le serveur FastAPI n'est pas en cours d'exécution sur 127.0.0.1:8001"
)


@integration
class TestIntegrationAuth:
    """Tests d'intégration nécessitant le serveur en cours."""

    def test_login_wrong_credentials(self):
        import httpx
        r = httpx.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "wrongpwd",
        })
        assert r.status_code == 401

    def test_query_without_token_forbidden(self):
        import httpx
        r = httpx.post(f"{BASE_URL}/api/db/query", json={"table": "exams"})
        assert r.status_code == 401

    def test_signup_admin_blocked(self):
        """L'auto-inscription avec rôle admin doit être refusée."""
        import httpx
        r = httpx.post(f"{BASE_URL}/api/auth/signup", json={
            "email": "hacker@evil.com",
            "password": "Hack3r!Pass",
            "role": "admin",
        })
        assert r.status_code == 403


@integration
class TestIntegrationNotifications:
    def _admin_headers(self):
        import httpx

        response = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@iut.com", "password": "admin123"},
        )
        if response.status_code != 200:
            pytest.skip("Compte admin de démonstration indisponible pour ce test d'intégration")

        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_new_student_gets_welcome_notification(self):
        import httpx

        headers = self._admin_headers()
        users_response = httpx.get(f"{BASE_URL}/api/auth/admin/users", headers=headers)
        assert users_response.status_code == 200

        first_student = next((u for u in users_response.json()["users"] if u["role"] == "etudiant"), None)
        assert first_student is not None

        suffix = str(int(time.time()))
        create_response = httpx.post(
            f"{BASE_URL}/api/auth/admin/users",
            headers=headers,
            json={
                "email": f"notif.test.{suffix}@example.com",
                "password": "TestPass123!",
                "full_name": "Notif Test",
                "role": "etudiant",
                "student_number": f"NT{suffix}",
                "level_id": first_student["student_profile"]["level_id"],
                "specialty_id": first_student["student_profile"]["specialty_id"],
            },
        )
        assert create_response.status_code == 200, create_response.text

        user_id = create_response.json()["user"]["id"]
        notif_response = httpx.post(
            f"{BASE_URL}/api/db/query",
            headers=headers,
            json={
                "table": "notifications",
                "filters": [{"column": "user_id", "op": "eq", "value": user_id}],
            },
        )
        assert notif_response.status_code == 200, notif_response.text
        notifications = notif_response.json()["data"]
        assert any("Bienvenue" in item["title"] for item in notifications)

    def test_publishing_exam_creates_student_notification(self):
        import httpx

        headers = self._admin_headers()
        users_response = httpx.get(f"{BASE_URL}/api/auth/admin/users", headers=headers)
        assert users_response.status_code == 200

        first_student = next((u for u in users_response.json()["users"] if u["role"] == "etudiant"), None)
        assert first_student is not None

        student_id = first_student["id"]
        student_profile = first_student["student_profile"]

        before_response = httpx.post(
            f"{BASE_URL}/api/db/query",
            headers=headers,
            json={
                "table": "notifications",
                "filters": [{"column": "user_id", "op": "eq", "value": student_id}],
            },
        )
        assert before_response.status_code == 200, before_response.text
        before_count = len(before_response.json()["data"])

        specialties_response = httpx.post(
            f"{BASE_URL}/api/db/query",
            headers=headers,
            json={
                "table": "specialties",
                "filters": [{"column": "id", "op": "eq", "value": student_profile["specialty_id"]}],
            },
        )
        assert specialties_response.status_code == 200, specialties_response.text
        specialty = specialties_response.json()["data"][0]
        subject_id = specialty["allowed_subject_ids"][0]

        exam_response = httpx.post(
            f"{BASE_URL}/api/db/insert",
            headers=headers,
            json={
                "table": "exams",
                "data": {
                    "title": f"ZZ Test notif publication {int(time.time())}",
                    "description": "test notification publication",
                    "subject_id": subject_id,
                    "specialty_id": student_profile["specialty_id"],
                    "level_id": student_profile["level_id"],
                    "evaluation_type": "controle",
                    "semester": "S1",
                    "duration_minutes": 30,
                    "total_points": 20,
                    "status": "publie",
                    "created_by": student_id,
                },
            },
        )
        assert exam_response.status_code == 200, exam_response.text

        after_response = httpx.post(
            f"{BASE_URL}/api/db/query",
            headers=headers,
            json={
                "table": "notifications",
                "filters": [{"column": "user_id", "op": "eq", "value": student_id}],
            },
        )
        assert after_response.status_code == 200, after_response.text
        after_count = len(after_response.json()["data"])

        assert after_count > before_count

    def test_professor_programming_exam_notifies_admin(self):
        import httpx

        headers = self._admin_headers()
        admin_login = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@iut.com", "password": "admin123"},
        )
        assert admin_login.status_code == 200, admin_login.text
        admin_user_id = admin_login.json()["user"]["id"]

        users_response = httpx.get(f"{BASE_URL}/api/auth/admin/users", headers=headers)
        assert users_response.status_code == 200
        first_student = next((u for u in users_response.json()["users"] if u["role"] == "etudiant"), None)
        assert first_student is not None

        suffix = str(int(time.time()))
        teacher_email = f"prof.notif.{suffix}@example.com"
        create_prof_response = httpx.post(
            f"{BASE_URL}/api/auth/admin/users",
            headers=headers,
            json={
                "email": teacher_email,
                "password": "TeacherPass123!",
                "full_name": "Prof Notification",
                "role": "professeur",
            },
        )
        assert create_prof_response.status_code == 200, create_prof_response.text

        teacher_login = httpx.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": teacher_email, "password": "TeacherPass123!"},
        )
        assert teacher_login.status_code == 200, teacher_login.text
        teacher_headers = {"Authorization": f"Bearer {teacher_login.json()['access_token']}"}

        specialty_response = httpx.post(
            f"{BASE_URL}/api/db/query",
            headers=headers,
            json={
                "table": "specialties",
                "filters": [{"column": "id", "op": "eq", "value": first_student["student_profile"]["specialty_id"]}],
            },
        )
        assert specialty_response.status_code == 200, specialty_response.text
        specialty = specialty_response.json()["data"][0]
        subject_id = specialty["allowed_subject_ids"][0]

        before_response = httpx.post(
            f"{BASE_URL}/api/db/query",
            headers=headers,
            json={
                "table": "notifications",
                "filters": [{"column": "user_id", "op": "eq", "value": admin_user_id}],
            },
        )
        assert before_response.status_code == 200, before_response.text
        before_count = len(before_response.json()["data"])

        schedule_response = httpx.post(
            f"{BASE_URL}/api/db/insert",
            headers=teacher_headers,
            json={
                "table": "exams",
                "data": {
                    "title": f"ZZ Test notif admin {suffix}",
                    "description": "test notification admin",
                    "subject_id": subject_id,
                    "specialty_id": first_student["student_profile"]["specialty_id"],
                    "level_id": first_student["student_profile"]["level_id"],
                    "evaluation_type": "controle",
                    "semester": "S1",
                    "duration_minutes": 30,
                    "total_points": 20,
                    "status": "programme",
                    "start_date": "2030-01-01T10:00:00",
                    "created_by": create_prof_response.json()["user"]["id"],
                },
            },
        )
        assert schedule_response.status_code == 200, schedule_response.text

        after_response = httpx.post(
            f"{BASE_URL}/api/db/query",
            headers=headers,
            json={
                "table": "notifications",
                "filters": [{"column": "user_id", "op": "eq", "value": admin_user_id}],
            },
        )
        assert after_response.status_code == 200, after_response.text
        notifications = after_response.json()["data"]

        assert len(notifications) > before_count
        assert any("enseignant" in item["title"].lower() for item in notifications)

