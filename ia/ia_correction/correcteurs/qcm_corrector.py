"""
Correcteur pour les questions à choix multiples (QCM)
"""

from .base_corrector import BaseCorrector
from ..models import Question, ReponseEleve, ResultatCorrection
from ..config import MAX_POINTS_QCM, PENALITE_MAUVAISE_REPONSE
import ollama
import json
import re


class QCMCorrector(BaseCorrector):
    """Correcteur spécialisé pour les QCM"""
    
    def _determiner_bonne_reponse_avec_ia(self, question: Question) -> str:
        """
        Utilise l'IA (Ollama) pour déterminer la bonne réponse à un QCM
        """
        try:
            options_text = "\n".join([f"{opt}" for opt in question.options]) if question.options else ""
            
            prompt = f"""Tu es un expert en {question.matiere}. Analyse cette question QCM et détermine la bonne réponse.

Question: {question.enonce}

Options:
{options_text}

RÈGLES:
1. Réponds UNIQUEMENT avec la lettre de la bonne réponse (a, b, c, ou d)
2. Utilise tes connaissances pour déterminer quelle option est correcte
3. Ne donne AUCUNE explication, juste la lettre

Réponse:"""

            response = ollama.chat(
                model='llama3.2',
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.1}
            )
            
            reponse_ia = response['message']['content'].strip().lower()
            
            # Extraire la lettre (a, b, c, d)
            match = re.search(r'\b([a-d])\b', reponse_ia)
            if match:
                lettre = match.group(1)
                # Trouver l'option correspondante
                for opt in question.options:
                    if opt.lower().startswith(lettre + ')'):
                        print(f"  🤖 IA a déterminé: {opt}")
                        return opt.strip().upper()
                
                # Si pas trouvé avec format "a)", chercher juste la lettre
                return lettre.upper()
            
            print(f"  ⚠️ IA n'a pas pu déterminer la réponse: {reponse_ia}")
            return ""
            
        except Exception as e:
            print(f"  ❌ Erreur IA pour déterminer la réponse: {e}")
            return ""
    
    def corriger(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """
        Corrige une question QCM par comparaison directe ou avec IA si pas de réponse définie
        """
        reponse_eleve = reponse.reponse.strip().upper() if reponse.reponse else ""
        reponse_correcte = question.reponse_attendue.strip().upper() if question.reponse_attendue else ""
        
        print(f"  🔍 DEBUG QCM: reponse_attendue='{question.reponse_attendue}'")
        print(f"  🔍 DEBUG QCM: options={question.options}")
        print(f"  🔍 DEBUG QCM: nb_options={len(question.options) if question.options else 0}")
        
        # Si pas de réponse correcte définie, utiliser l'IA pour la déterminer
        if not reponse_correcte and question.options and len(question.options) >= 2:
            print(f"  🤖 Pas de correction définie, utilisation de l'IA...")
            reponse_correcte = self._determiner_bonne_reponse_avec_ia(question)
            methode = "qcm_ia_autonome"
        else:
            methode = "qcm_comparaison_directe"
        
        # Si toujours pas de réponse correcte, impossible de noter
        if not reponse_correcte:
            return ResultatCorrection(
                question_id=question.id,
                points_obtenus=0,
                points_max=question.points_max,
                pourcentage=0,
                est_correct=False,
                feedback="⚠️ Impossible de corriger automatiquement. Correction manuelle requise.",
                details={
                    "reponse_eleve": reponse_eleve,
                    "erreur": "reponse_attendue non définie et IA n'a pas pu déterminer"
                },
                methode_correction="qcm_echec"
            )
        
        # Vérifier si la réponse est correcte
        est_correct = reponse_eleve == reponse_correcte
        
        # Calculer les points
        if est_correct:
            points_obtenus = question.points_max
            if methode == "qcm_ia_autonome":
                feedback = f"✓ Correct ! L'IA a déterminé que la bonne réponse était {reponse_correcte}."
            else:
                feedback = f"✓ Correct ! La bonne réponse était bien {reponse_correcte}."
        else:
            points_obtenus = 0  # Mauvaise réponse = 0 point
            if reponse_eleve:
                if methode == "qcm_ia_autonome":
                    feedback = f"✗ Incorrect. Vous avez répondu {reponse_eleve}, mais selon l'analyse IA, la bonne réponse était {reponse_correcte}."
                else:
                    feedback = f"✗ Incorrect. Vous avez répondu {reponse_eleve}, la bonne réponse était {reponse_correcte}."
            else:
                feedback = f"✗ Aucune réponse fournie. La bonne réponse était {reponse_correcte}."
        
        pourcentage = self.calculer_pourcentage(points_obtenus, question.points_max)
        
        return ResultatCorrection(
            question_id=question.id,
            points_obtenus=points_obtenus,
            points_max=question.points_max,
            pourcentage=pourcentage,
            est_correct=est_correct,
            feedback=feedback,
            details={
                "reponse_eleve": reponse_eleve,
                "reponse_correcte": reponse_correcte,
                "methode": methode
            },
            methode_correction=methode
        )
    
    def corriger_qcm_multiple(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """
        Corrige un QCM à réponses multiples (A,B,D par exemple)
        """
        reponses_eleve = set(r.strip().upper() for r in reponse.reponse.split(','))
        reponses_correctes = set(r.strip().upper() for r in question.reponse_attendue.split(','))
        
        # Calculer les bonnes et mauvaises réponses
        bonnes_reponses = reponses_eleve & reponses_correctes
        reponses_manquantes = reponses_correctes - reponses_eleve
        reponses_erronees = reponses_eleve - reponses_correctes
        
        # Calculer le score proportionnel
        if len(reponses_correctes) > 0:
            score = len(bonnes_reponses) / len(reponses_correctes)
            # Pénalité pour réponses erronées
            score -= len(reponses_erronees) * 0.25
            score = max(0, score)
        else:
            score = 0
        
        points_obtenus = question.points_max * score
        est_correct = reponses_eleve == reponses_correctes
        pourcentage = self.calculer_pourcentage(points_obtenus, question.points_max)
        
        # Générer le feedback
        feedback_parts = []
        if bonnes_reponses:
            feedback_parts.append(f"✓ Réponses correctes: {', '.join(sorted(bonnes_reponses))}")
        if reponses_manquantes:
            feedback_parts.append(f"⚠ Réponses manquantes: {', '.join(sorted(reponses_manquantes))}")
        if reponses_erronees:
            feedback_parts.append(f"✗ Réponses erronées: {', '.join(sorted(reponses_erronees))}")
        
        feedback = "\n".join(feedback_parts) if feedback_parts else "Aucune réponse fournie"
        
        return ResultatCorrection(
            question_id=question.id,
            points_obtenus=points_obtenus,
            points_max=question.points_max,
            pourcentage=pourcentage,
            est_correct=est_correct,
            feedback=feedback,
            details={
                "reponses_eleve": list(reponses_eleve),
                "reponses_correctes": list(reponses_correctes),
                "bonnes_reponses": list(bonnes_reponses),
                "reponses_manquantes": list(reponses_manquantes),
                "reponses_erronees": list(reponses_erronees)
            },
            methode_correction="Comparaison multiple avec barème proportionnel"
        )
