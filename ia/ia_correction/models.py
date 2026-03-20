"""
Modèles de données pour le système de correction
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TypeQuestion(str, Enum):
    """Types de questions supportés"""
    QCM = "qcm"
    CALCUL = "calcul"
    COURTE = "courte"
    LONGUE = "longue"


class Matiere(str, Enum):
    """Matières supportées"""
    MATHEMATIQUES = "mathematiques"
    PHYSIQUE = "physique"
    RESEAU = "reseau"
    INFORMATIQUE = "informatique"
    AUTRE = "autre"


class Question(BaseModel):
    """Modèle d'une question"""
    id: str
    type: TypeQuestion
    matiere: Matiere
    enonce: str
    points_max: float
    reponse_attendue: Optional[str] = None
    options: Optional[List[str]] = None  # Pour QCM
    criteres_evaluation: Optional[List[str]] = None  # Pour questions longues
    tolerance: Optional[float] = None  # Pour calculs
    formule_symbolique: Optional[str] = None  # Pour questions mathématiques


class ReponseEleve(BaseModel):
    """Modèle de la réponse d'un élève"""
    question_id: str
    reponse: str
    temps_reponse: Optional[int] = None  # en secondes


class ResultatCorrection(BaseModel):
    """Résultat de la correction d'une question"""
    question_id: str
    points_obtenus: float
    points_max: float
    pourcentage: float
    est_correct: bool
    feedback: str
    details: Optional[Dict[str, Any]] = None
    methode_correction: str


class Evaluation(BaseModel):
    """Modèle d'une évaluation complète"""
    id: str
    titre: str
    matiere: Matiere
    questions: List[Question]
    duree_minutes: int
    bareme_total: float


class CopieEleve(BaseModel):
    """Modèle de la copie d'un élève"""
    evaluation_id: str
    eleve_id: str
    eleve_nom: str
    reponses: List[ReponseEleve]
    date_soumission: Optional[str] = None


class ResultatEvaluation(BaseModel):
    """Résultat complet de l'évaluation d'un élève"""
    copie: CopieEleve
    resultats: List[ResultatCorrection]
    note_totale: float
    note_max: float
    pourcentage_global: float
    appreciation: str
