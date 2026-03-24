from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


class SignUpIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str | None = None
    role: Literal["admin", "professeur", "etudiant"] = "etudiant"
    student_number: str | None = None
    level_id: str | None = None
    specialty_id: str | None = None

    @model_validator(mode="after")
    def validate_student_fields(self):
        if self.role == "etudiant":
            if not self.student_number:
                raise ValueError("Le matricule est obligatoire pour un étudiant")
            if not self.level_id:
                raise ValueError("Le niveau est obligatoire pour un étudiant")
            if not self.specialty_id:
                raise ValueError("La spécialité est obligatoire pour un étudiant")
        return self


class SignInIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str | None = None


class SessionOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut


class AdminCreateUserIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str | None = None
    role: Literal["admin", "professeur", "etudiant"]
    student_number: str | None = None
    level_id: str | None = None
    specialty_id: str | None = None

    @model_validator(mode="after")
    def validate_student_fields(self):
        if self.role == "etudiant":
            if not self.student_number:
                raise ValueError("Le matricule est obligatoire pour un étudiant")
            if not self.level_id:
                raise ValueError("Le niveau est obligatoire pour un étudiant")
            if not self.specialty_id:
                raise ValueError("La spécialité est obligatoire pour un étudiant")
        return self


class AdminUpdateRoleIn(BaseModel):
    role: Literal["admin", "professeur", "etudiant"]
    student_number: str | None = None
    level_id: str | None = None
    specialty_id: str | None = None

    @model_validator(mode="after")
    def validate_student_fields(self):
        if self.role == "etudiant":
            if not self.student_number:
                raise ValueError("Le matricule est obligatoire pour un étudiant")
            if not self.level_id:
                raise ValueError("Le niveau est obligatoire pour un étudiant")
            if not self.specialty_id:
                raise ValueError("La spécialité est obligatoire pour un étudiant")
        return self


class AdminResetPasswordIn(BaseModel):
    user_id: str
    new_password: str = Field(min_length=8)


class AdminDisableUserIn(BaseModel):
    user_id: str
    disabled: bool
