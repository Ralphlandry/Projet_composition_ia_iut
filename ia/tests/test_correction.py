"""
Tests unitaires pour le système de correction
"""

import pytest
from ia_correction.engine import CorrectionEngine
from ia_correction.models import (
    Question, ReponseEleve, TypeQuestion, Matiere,
    Evaluation, CopieEleve
)


@pytest.fixture
def engine():
    """Fixture pour le moteur de correction"""
    return CorrectionEngine()


class TestQCMCorrector:
    """Tests pour le correcteur QCM"""
    
    def test_qcm_correct(self, engine):
        """Test réponse QCM correcte"""
        question = Question(
            id="q1",
            type=TypeQuestion.QCM,
            matiere=Matiere.RESEAU,
            enonce="Test",
            points_max=2.0,
            reponse_attendue="B"
        )
        
        reponse = ReponseEleve(question_id="q1", reponse="B")
        resultat = engine.corriger_question(question, reponse)
        
        assert resultat.points_obtenus == 2.0
        assert resultat.est_correct == True
    
    def test_qcm_incorrect(self, engine):
        """Test réponse QCM incorrecte"""
        question = Question(
            id="q1",
            type=TypeQuestion.QCM,
            matiere=Matiere.RESEAU,
            enonce="Test",
            points_max=2.0,
            reponse_attendue="B"
        )
        
        reponse = ReponseEleve(question_id="q1", reponse="A")
        resultat = engine.corriger_question(question, reponse)
        
        assert resultat.points_obtenus == 0.0
        assert resultat.est_correct == False


class TestCalculCorrector:
    """Tests pour le correcteur de calculs"""
    
    def test_calcul_exact(self, engine):
        """Test calcul exact"""
        question = Question(
            id="q2",
            type=TypeQuestion.CALCUL,
            matiere=Matiere.MATHEMATIQUES,
            enonce="Test calcul",
            points_max=3.0,
            reponse_attendue="100",
            tolerance=0.01
        )
        
        reponse = ReponseEleve(question_id="q2", reponse="100")
        resultat = engine.corriger_question(question, reponse)
        
        assert resultat.points_obtenus == 3.0
        assert resultat.est_correct == True
    
    def test_calcul_avec_tolerance(self, engine):
        """Test calcul avec tolérance"""
        question = Question(
            id="q2",
            type=TypeQuestion.CALCUL,
            matiere=Matiere.PHYSIQUE,
            enonce="Test",
            points_max=3.0,
            reponse_attendue="10.0",
            tolerance=0.1
        )
        
        reponse = ReponseEleve(question_id="q2", reponse="10.05")
        resultat = engine.corriger_question(question, reponse)
        
        assert resultat.points_obtenus > 0
    
    def test_calcul_incorrect(self, engine):
        """Test calcul incorrect"""
        question = Question(
            id="q2",
            type=TypeQuestion.CALCUL,
            matiere=Matiere.MATHEMATIQUES,
            enonce="Test",
            points_max=3.0,
            reponse_attendue="100"
        )
        
        reponse = ReponseEleve(question_id="q2", reponse="50")
        resultat = engine.corriger_question(question, reponse)
        
        assert resultat.points_obtenus == 0


class TestCourteCorrector:
    """Tests pour le correcteur de questions courtes"""
    
    def test_reponse_exacte(self, engine):
        """Test réponse exacte"""
        question = Question(
            id="q3",
            type=TypeQuestion.COURTE,
            matiere=Matiere.RESEAU,
            enonce="Test",
            points_max=4.0,
            reponse_attendue="Un routeur"
        )
        
        reponse = ReponseEleve(question_id="q3", reponse="Un routeur")
        resultat = engine.corriger_question(question, reponse)
        
        assert resultat.points_obtenus > 0


class TestCopieComplete:
    """Tests pour la correction de copie complète"""
    
    def test_copie_complete(self, engine):
        """Test correction copie complète"""
        evaluation = Evaluation(
            id="eval1",
            titre="Test",
            matiere=Matiere.RESEAU,
            duree_minutes=30,
            bareme_total=10,
            questions=[
                Question(
                    id="q1",
                    type=TypeQuestion.QCM,
                    matiere=Matiere.RESEAU,
                    enonce="Test QCM",
                    points_max=5.0,
                    reponse_attendue="A"
                ),
                Question(
                    id="q2",
                    type=TypeQuestion.CALCUL,
                    matiere=Matiere.MATHEMATIQUES,
                    enonce="Test Calcul",
                    points_max=5.0,
                    reponse_attendue="50"
                )
            ]
        )
        
        copie = CopieEleve(
            evaluation_id="eval1",
            eleve_id="e001",
            eleve_nom="Test Eleve",
            reponses=[
                ReponseEleve(question_id="q1", reponse="A"),
                ReponseEleve(question_id="q2", reponse="50")
            ]
        )
        
        resultat = engine.corriger_copie(evaluation, copie)
        
        assert resultat.note_totale == 10.0
        assert resultat.note_max == 10.0
        assert resultat.pourcentage_global == 100.0
        assert len(resultat.resultats) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
