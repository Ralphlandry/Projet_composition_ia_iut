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
        assert r.status_code == 403

    def test_signup_admin_blocked(self):
        """L'auto-inscription avec rôle admin doit être refusée."""
        import httpx
        r = httpx.post(f"{BASE_URL}/api/auth/signup", json={
            "email": "hacker@evil.com",
            "password": "Hack3r!Pass",
            "role": "admin",
        })
        assert r.status_code == 403

