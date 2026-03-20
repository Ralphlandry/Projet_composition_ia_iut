"""
Correcteur pour les questions à réponse longue
Utilise un LLM (Ollama) pour évaluation approfondie
"""

import json
import re
from typing import Optional, Dict, Any
from .base_corrector import BaseCorrector
from ..models import Question, ReponseEleve, ResultatCorrection
from ..config import OLLAMA_MODEL, OLLAMA_HOST, TIMEOUT_LLM

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False


class LongueCorrector(BaseCorrector):
    """Correcteur spécialisé pour les questions longues avec LLM"""
    
    def __init__(self):
        super().__init__()
        self.ollama_disponible = OLLAMA_AVAILABLE
        
        print(f" DEBUG: OLLAMA_AVAILABLE = {OLLAMA_AVAILABLE}")
        
        if not OLLAMA_AVAILABLE:
            print("⚠ Warning: ollama n'est pas installé. Correction LLM indisponible.")
        else:
            # Vérifier si Ollama est accessible
            try:
                print(f" DEBUG: Tentative de connexion à Ollama sur {OLLAMA_HOST}...")
                result = ollama.list()
                print(f" DEBUG: ollama.list() retourné: {result}")
                self.ollama_disponible = True
                print(f"✓ Ollama connecté (modèle: {OLLAMA_MODEL})")
            except Exception as e:
                print(f"⚠ Ollama non accessible: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
                self.ollama_disponible = False
    
    def corriger(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """
        Corrige une question longue en utilisant un LLM
        """
        
        print(f" DEBUG LongueCorrector.corriger(): ollama_disponible={self.ollama_disponible}")
        print(f" DEBUG Question: {question.enonce[:50]}...")
        print(f" DEBUG Réponse élève: {reponse.reponse[:50]}...")
        
        if not self.ollama_disponible:
            print("⚠ DEBUG: Utilisation de _corriger_basique car ollama_disponible=False")
            return self._corriger_basique(question, reponse)
        
        print("✓ DEBUG: Appel de _corriger_avec_llm...")
        return self._corriger_avec_llm(question, reponse)
    
    def _corriger_basique(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """Correction basique sans LLM"""
        longueur_reponse = len(reponse.reponse.split())
        longueur_attendue = len(question.reponse_attendue.split()) if question.reponse_attendue else 50
        
        # Score basé sur la longueur
        ratio_longueur = min(longueur_reponse / longueur_attendue, 1.0)
        points_obtenus = question.points_max * ratio_longueur * 0.5  # Max 50% sans LLM
        
        feedback = f" Réponse reçue ({longueur_reponse} mots). Correction LLM non disponible."
        
        pourcentage = self.calculer_pourcentage(points_obtenus, question.points_max)
        
        return ResultatCorrection(
            question_id=question.id,
            points_obtenus=points_obtenus,
            points_max=question.points_max,
            pourcentage=pourcentage,
            est_correct=False,
            feedback=feedback,
            details={
                "longueur_reponse": longueur_reponse,
                "methode": "basique"
            },
            methode_correction="Évaluation basique (LLM indisponible)"
        )
    
    def _corriger_avec_llm(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """Correction avec LLM (Ollama)"""
        try:
            print(" DEBUG: Génération du prompt...")
            # Préparer le prompt de correction
            prompt = self._generer_prompt_correction(question, reponse)
            print(f" DEBUG: Prompt généré: {len(prompt)} caractères")
            
            print(f" DEBUG: Appel ollama.chat avec modèle={OLLAMA_MODEL}...")
            # Appeler Ollama
            response = ollama.chat(
                model=OLLAMA_MODEL,
                messages=[
                    {
                        'role': 'system',
                        'content': 'Correcteur. Réponds brièvement.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                options={
                    'temperature': 0.1,  # Très déterministe = plus rapide
                    'num_predict': 150,  # Maximum 150 tokens
                    'top_k': 10,
                }
            )
            
            # Extraire la réponse
            reponse_llm = response['message']['content']
            print(f" DEBUG: Réponse LLM reçue: {len(reponse_llm)} caractères")
            print(f" DEBUG: Contenu: {reponse_llm[:200]}...")
            
            # Parser la réponse du LLM
            print(" DEBUG: Parsing de la réponse...")
            resultat_analyse = self._parser_reponse_llm(reponse_llm, question.points_max)
            print(f" DEBUG: Points bruts du LLM: {resultat_analyse['points_obtenus']}/{question.points_max}")
            
            # Appliquer le système de paliers
            pourcentage_reponse = (resultat_analyse['points_obtenus'] / question.points_max) * 100
            
            if pourcentage_reponse > 50:
                # > 50% → Point complet
                points_finaux = question.points_max
                appreciation_palier = "Réponse correcte"
            elif pourcentage_reponse >= 30:
                # 30-50% → Moitié
                points_finaux = question.points_max * 0.5
                appreciation_palier = "Réponse partiellement correcte"
            elif pourcentage_reponse >= 25:
                # 25-30% → Quart
                points_finaux = question.points_max * 0.25
                appreciation_palier = "Réponse incomplète"
            else:
                # < 25% → 0
                points_finaux = 0
                appreciation_palier = "Réponse insuffisante"
            
            print(f" DEBUG: Points finaux après paliers: {points_finaux}/{question.points_max} ({appreciation_palier})")
            
            pourcentage = self.calculer_pourcentage(points_finaux, question.points_max)
            
            # Ajouter l'appréciation au feedback
            feedback_final = f"**{appreciation_palier}** ({pourcentage_reponse:.0f}% de maîtrise)\n\n{resultat_analyse['feedback']}"
            
            return ResultatCorrection(
                question_id=question.id,
                points_obtenus=points_finaux,
                points_max=question.points_max,
                pourcentage=pourcentage,
                est_correct=points_finaux >= question.points_max * 0.5,
                feedback=feedback_final,
                details={
                    "analyse_complete": reponse_llm,
                    "points_forts": resultat_analyse.get('points_forts', []),
                    "points_amelioration": resultat_analyse.get('points_amelioration', []),
                    "criteres": resultat_analyse.get('criteres', {}),
                    "points_llm_bruts": resultat_analyse['points_obtenus'],
                    "pourcentage_maitrise": pourcentage_reponse
                },
                methode_correction=f"Évaluation LLM ({OLLAMA_MODEL})"
            )
            
        except Exception as e:
            print(f"ERREUR lors de l'appel a Ollama: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return self._corriger_basique(question, reponse)
    
    def _generer_prompt_correction(self, question: Question, reponse: ReponseEleve) -> str:
        """Génère le prompt pour le LLM"""
        
        criteres_str = ""
        if question.criteres_evaluation:
            criteres_str = "\n".join([f"- {critere}" for critere in question.criteres_evaluation])
        else:
            criteres_str = "- Pertinence du contenu\n- Clarté de l'expression\n- Argumentation\n- Connaissances démontrées"
        
        reponse_type_str = ""
        if question.reponse_attendue:
            reponse_type_str = f"\n\n**ÉLÉMENTS DE RÉPONSE ATTENDUS:**\n{question.reponse_attendue}"
        
        # Prompt ultra-court pour vitesse maximale
        question_courte = question.enonce[:100] + "..." if len(question.enonce) > 100 else question.enonce
        reponse_courte = reponse.reponse[:150] + "..." if len(reponse.reponse) > 150 else reponse.reponse
        
        prompt = f"""Note: 0-{question.points_max}
Q: {question_courte}
R: {reponse_courte}

Format:
NOTE: X/{question.points_max}
FEEDBACK: (1 ligne)
RÉPONSE: (essentiel)"""
        return prompt
    
    def _parser_reponse_llm(self, reponse_llm: str, points_max: float) -> Dict[str, Any]:
        """Parse la réponse du LLM pour extraire la note et le feedback"""
        
        # Extraire la note
        match_note = re.search(r'NOTE[:\s]+(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)', reponse_llm, re.IGNORECASE)
        if match_note:
            points_obtenus = float(match_note.group(1))
        else:
            # Essayer d'autres formats
            match_note2 = re.search(r'(\d+(?:\.\d+)?)\s*/\s*' + str(points_max), reponse_llm)
            if match_note2:
                points_obtenus = float(match_note2.group(1))
            else:
                # Par défaut, analyse le contenu pour estimer
                if "excellent" in reponse_llm.lower() or "très bien" in reponse_llm.lower():
                    points_obtenus = points_max * 0.9
                elif "bien" in reponse_llm.lower() or "satisfaisant" in reponse_llm.lower():
                    points_obtenus = points_max * 0.7
                elif "moyen" in reponse_llm.lower() or "passable" in reponse_llm.lower():
                    points_obtenus = points_max * 0.5
                else:
                    points_obtenus = points_max * 0.3
        
        # Limiter aux bornes
        points_obtenus = max(0, min(points_obtenus, points_max))
        
        # Extraire points forts
        points_forts = []
        match_forts = re.search(r'POINTS FORTS[:\s]+(.*?)(?=POINTS À AMÉLIORER|FEEDBACK|$)', 
                               reponse_llm, re.IGNORECASE | re.DOTALL)
        if match_forts:
            points_forts_text = match_forts.group(1).strip()
            points_forts = [p.strip('- ').strip() for p in points_forts_text.split('\n') if p.strip()]
        
        # Extraire points à améliorer
        points_amelioration = []
        match_ameliorer = re.search(r'POINTS À AMÉLIORER[:\s]+(.*?)(?=FEEDBACK|RÉPONSE CORRECTE|$)', 
                                   reponse_llm, re.IGNORECASE | re.DOTALL)
        if match_ameliorer:
            ameliorer_text = match_ameliorer.group(1).strip()
            points_amelioration = [p.strip('- ').strip() for p in ameliorer_text.split('\n') if p.strip()]
        
        # Extraire réponse correcte
        reponse_correcte = ""
        match_reponse_correcte = re.search(r'RÉPONSE CORRECTE[:\s]+(.*?)$', reponse_llm, re.IGNORECASE | re.DOTALL)
        if match_reponse_correcte:
            reponse_correcte = match_reponse_correcte.group(1).strip()
        
        # Extraire feedback
        match_feedback = re.search(r'FEEDBACK[:\s]+(.*?)(?=RÉPONSE CORRECTE|$)', reponse_llm, re.IGNORECASE | re.DOTALL)
        if match_feedback:
            feedback = match_feedback.group(1).strip()
        else:
            feedback = reponse_llm  # Utiliser toute la réponse si pas de structure claire
        
        # Ajouter la réponse correcte au feedback
        if reponse_correcte:
            feedback += f"\n\n RÉPONSE CORRECTE ATTENDUE:\n{reponse_correcte}"
        
        return {
            'points_obtenus': points_obtenus,
            'feedback': feedback,
            'points_forts': points_forts,
            'points_amelioration': points_amelioration,
            'reponse_correcte': reponse_correcte
        }
