"""
Moteur principal de correction automatique
Orchestre tous les modules de correction
"""

from typing import List
from .models import (
    TypeQuestion, Question, ReponseEleve, ResultatCorrection,
    CopieEleve, ResultatEvaluation, Evaluation
)
from .correcteurs import (
    QCMCorrector,
    CalculCorrector,
    CourteCorrector,
    LongueCorrector
)


class CorrectionEngine:
    """
    Moteur principal qui route les questions vers le bon correcteur
    """
    
    def __init__(self):
        """Initialise tous les correcteurs"""
        print(" Initialisation du moteur de correction IA...")
        
        self.qcm_corrector = QCMCorrector()
        self.calcul_corrector = CalculCorrector()
        self.courte_corrector = CourteCorrector()
        self.longue_corrector = LongueCorrector()
        
        print(" Tous les modules de correction sont prêts")
    
    def corriger_question(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """
        Corrige une question unique en la routant vers le bon correcteur
        
        Args:
            question: La question à corriger
            reponse: La réponse de l'élève
            
        Returns:
            ResultatCorrection avec la note et le feedback
        """
        
        # Router vers le bon correcteur selon le type de question
        if question.type == TypeQuestion.QCM:
            return self.qcm_corrector.corriger(question, reponse)
        
        elif question.type == TypeQuestion.CALCUL:
            return self.calcul_corrector.corriger(question, reponse)
        
        elif question.type == TypeQuestion.COURTE:
            return self.courte_corrector.corriger(question, reponse)
        
        elif question.type == TypeQuestion.LONGUE:
            return self.longue_corrector.corriger(question, reponse)
        
        else:
            raise ValueError(f"Type de question non supporté: {question.type}")
    
    def corriger_copie(self, evaluation: Evaluation, copie: CopieEleve) -> ResultatEvaluation:
        """
        Corrige une copie complète d'un élève
        
        Args:
            evaluation: L'évaluation avec toutes les questions
            copie: La copie de l'élève avec toutes ses réponses
            
        Returns:
            ResultatEvaluation avec tous les résultats et la note finale
        """
        
        print(f"\n Correction de la copie de {copie.eleve_nom}...")
        
        resultats = []
        note_totale = 0.0
        note_max = 0.0
        
        # Créer un dictionnaire des réponses pour accès rapide
        reponses_dict = {r.question_id: r for r in copie.reponses}
        
        # Corriger chaque question
        for i, question in enumerate(evaluation.questions, 1):
            print(f"  Question {i}/{len(evaluation.questions)} ({question.type.value})...", end=" ")
            
            # Récupérer la réponse de l'élève
            reponse_eleve = reponses_dict.get(question.id)
            
            if reponse_eleve is None:
                # Question non répondue
                resultat = ResultatCorrection(
                    question_id=question.id,
                    points_obtenus=0,
                    points_max=question.points_max,
                    pourcentage=0,
                    est_correct=False,
                    feedback="Question non répondue",
                    methode_correction="Non répondu"
                )
            else:
                # Corriger la question
                resultat = self.corriger_question(question, reponse_eleve)
            
            resultats.append(resultat)
            note_totale += resultat.points_obtenus
            note_max += question.points_max
            
            print(f"{resultat.points_obtenus:.1f}/{resultat.points_max} pts")
        
        # Calculer le pourcentage global
        pourcentage_global = (note_totale / note_max * 100) if note_max > 0 else 0
        
        # Générer l'appréciation globale
        appreciation = self._generer_appreciation_globale(pourcentage_global, resultats)
        
        print(f"\n✓ Correction terminée: {note_totale:.1f}/{note_max} ({pourcentage_global:.1f}%)")
        
        return ResultatEvaluation(
            copie=copie,
            resultats=resultats,
            note_totale=note_totale,
            note_max=note_max,
            pourcentage_global=pourcentage_global,
            appreciation=appreciation
        )
    
    def corriger_plusieurs_copies(self, evaluation: Evaluation, 
                                  copies: List[CopieEleve]) -> List[ResultatEvaluation]:
        """
        Corrige plusieurs copies pour une même évaluation
        
        Args:
            evaluation: L'évaluation commune
            copies: Liste des copies à corriger
            
        Returns:
            Liste des résultats d'évaluation
        """
        
        print(f"\n🎓 Correction de {len(copies)} copies pour '{evaluation.titre}'")
        print("=" * 60)
        
        resultats_evaluations = []
        
        for copie in copies:
            resultat = self.corriger_copie(evaluation, copie)
            resultats_evaluations.append(resultat)
        
        # Afficher les statistiques
        self._afficher_statistiques(resultats_evaluations)
        
        return resultats_evaluations
    
    def _generer_appreciation_globale(self, pourcentage: float, 
                                     resultats: List[ResultatCorrection]) -> str:
        """Génère une appréciation globale personnalisée"""
        
        # Appréciation de base selon la note
        if pourcentage >= 90:
            appreciation_base = "Excellent travail"
        elif pourcentage >= 75:
            appreciation_base = "Très bon travail"
        elif pourcentage >= 60:
            appreciation_base = "Bon travail"
        elif pourcentage >= 50:
            appreciation_base = "Travail satisfaisant"
        elif pourcentage >= 40:
            appreciation_base = "Travail passable"
        else:
            appreciation_base = "Travail insuffisant"
        
        # Compter les questions par statut
        nb_correct = sum(1 for r in resultats if r.est_correct)
        nb_total = len(resultats)
        
        appreciation = f"{appreciation_base}. "
        appreciation += f"{nb_correct}/{nb_total} questions maîtrisées. "
        
        # Ajouter des conseils selon le niveau
        if pourcentage < 50:
            appreciation += "Il est recommandé de revoir les notions de base et de s'exercer davantage."
        elif pourcentage < 75:
            appreciation += "Continuez vos efforts pour consolider vos acquis."
        else:
            appreciation += "Très bonne maîtrise du sujet, continuez ainsi !"
        
        return appreciation
    
    def _afficher_statistiques(self, resultats: List[ResultatEvaluation]):
        """Affiche des statistiques sur les corrections"""
        
        if not resultats:
            return
        
        notes = [r.note_totale for r in resultats]
        pourcentages = [r.pourcentage_global for r in resultats]
        
        print("\n STATISTIQUES:")
        print(f"  Nombre de copies: {len(resultats)}")
        print(f"  Moyenne: {sum(notes)/len(notes):.2f}/{resultats[0].note_max}")
        print(f"  Note minimale: {min(notes):.2f}")
        print(f"  Note maximale: {max(notes):.2f}")
        print(f"  Pourcentage moyen: {sum(pourcentages)/len(pourcentages):.1f}%")
        
        # Répartition
        excellents = sum(1 for p in pourcentages if p >= 75)
        bons = sum(1 for p in pourcentages if 50 <= p < 75)
        insuffisants = sum(1 for p in pourcentages if p < 50)
        
        print(f"\n  Répartition:")
        print(f"    • Excellent (≥75%): {excellents}")
        print(f"    • Bon (50-75%): {bons}")
        print(f"    • Insuffisant (<50%): {insuffisants}")
        print("=" * 60)
