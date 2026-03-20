"""
Correcteur pour les questions à réponse courte
Utilise l'analyse sémantique (Sentence Transformers) ou LLM si autonome
"""

from typing import Optional
from .base_corrector import BaseCorrector
from ..models import Question, ReponseEleve, ResultatCorrection
from ..config import (
    SENTENCE_TRANSFORMER_MODEL,
    SIMILARITE_EXCELLENTE,
    SIMILARITE_BONNE,
    SIMILARITE_MOYENNE,
    SIMILARITE_FAIBLE,
    OLLAMA_MODEL
)

try:
    from sentence_transformers import SentenceTransformer, util
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False


class CourteCorrector(BaseCorrector):
    """Correcteur spécialisé pour les questions courtes avec analyse sémantique ou LLM"""
    
    def __init__(self):
        super().__init__()
        self.model: Optional[SentenceTransformer] = None
        self.ollama_disponible = False
        
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                print("📥 Chargement du modèle Sentence Transformer...")
                self.model = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)
                print("✓ Modèle chargé avec succès")
            except Exception as e:
                print(f"⚠ Erreur lors du chargement du modèle: {e}")
                self.model = None
        else:
            print("⚠ Warning: sentence-transformers n'est pas installé. Correction basique uniquement.")
        
        # Vérifier Ollama pour mode autonome
        if OLLAMA_AVAILABLE:
            try:
                ollama.list()
                self.ollama_disponible = True
            except:
                pass
    
    def corriger(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """
        Corrige une question courte en utilisant la similarité sémantique rapide
        """
        
        # TOUJOURS utiliser l'analyse sémantique pour les questions courtes (rapide)
        # Le LLM est trop lent pour une utilisation en masse
        if not self.model:
            return self._corriger_simple(question, reponse)
        
        # Si pas de réponse attendue, générer une réponse type générique
        if not question.reponse_attendue or question.reponse_attendue.strip() == '':
            # Utiliser l'énoncé comme référence pour l'analyse sémantique
            question.reponse_attendue = f"Réponse pertinente à: {question.enonce}"
        
        return self._corriger_semantique(question, reponse)
    
    def _corriger_simple(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """Correction basique par comparaison de mots-clés"""
        reponse_eleve = reponse.reponse.lower().strip()
        reponse_attendue = question.reponse_attendue.lower().strip()
        
        # Comparaison exacte
        if reponse_eleve == reponse_attendue:
            points_obtenus = question.points_max
            feedback = "✓ Réponse exacte"
            similarite = 1.0
        else:
            # Calculer similarité basique (mots en commun)
            mots_eleve = set(reponse_eleve.split())
            mots_attendus = set(reponse_attendue.split())
            
            if len(mots_attendus) == 0:
                similarite = 0.0
            else:
                mots_communs = mots_eleve & mots_attendus
                similarite = len(mots_communs) / len(mots_attendus)
            
            points_obtenus = question.points_max * similarite
            
            if similarite >= 0.7:
                feedback = f"✓ Bonne réponse (similarité: {similarite:.0%})"
            elif similarite >= 0.4:
                feedback = f"⚠ Réponse partielle (similarité: {similarite:.0%})"
            else:
                feedback = f"✗ Réponse insuffisante (similarité: {similarite:.0%})"
        
        pourcentage = self.calculer_pourcentage(points_obtenus, question.points_max)
        
        return ResultatCorrection(
            question_id=question.id,
            points_obtenus=points_obtenus,
            points_max=question.points_max,
            pourcentage=pourcentage,
            est_correct=similarite >= 0.7,
            feedback=feedback,
            details={
                "reponse_eleve": reponse.reponse,
                "reponse_attendue": question.reponse_attendue,
                "similarite": similarite
            },
            methode_correction="Comparaison mots-clés"
        )
    
    def _corriger_semantique(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """Correction avec analyse sémantique (Sentence Transformers)"""
        try:
            # Encoder les réponses
            embedding_eleve = self.model.encode(reponse.reponse, convert_to_tensor=True)
            embedding_attendu = self.model.encode(question.reponse_attendue, convert_to_tensor=True)
            
            # Calculer la similarité cosinus
            similarite = float(util.cos_sim(embedding_eleve, embedding_attendu)[0][0])
            
            # Système de notation par paliers (au lieu de score continu)
            pourcentage_similarite = similarite * 100
            
            if pourcentage_similarite > 50:
                # Réponse correcte > 50% → Point complet
                ratio_points = 1.0
                appreciation = "Réponse correcte"
                symbole = "✓"
                est_correct = True
            elif pourcentage_similarite >= 30:
                # Entre 30% et 50% → Moitié du point
                ratio_points = 0.5
                appreciation = "Réponse partiellement correcte"
                symbole = "⚠"
                est_correct = False
            elif pourcentage_similarite >= 25:
                # Entre 25% et 30% → Quart du point
                ratio_points = 0.25
                appreciation = "Réponse incomplète"
                symbole = "⚠"
                est_correct = False
            else:
                # < 25% → 0 point
                ratio_points = 0.0
                appreciation = "Réponse insuffisante"
                symbole = "✗"
                est_correct = False
            
            points_obtenus = question.points_max * ratio_points
            
            # Générer le feedback
            feedback = f"{symbole} {appreciation} (similarité: {similarite:.1%})\n"
            feedback += f"Points attribués: {points_obtenus}/{question.points_max}"
            
            # Ajouter la réponse attendue si pas 100%
            if ratio_points < 1.0:
                feedback += f"\n\n💡 Réponse attendue: {question.reponse_attendue}"
            
            pourcentage = self.calculer_pourcentage(points_obtenus, question.points_max)
            
            return ResultatCorrection(
                question_id=question.id,
                points_obtenus=points_obtenus,
                points_max=question.points_max,
                pourcentage=pourcentage,
                est_correct=est_correct,
                feedback=feedback,
                details={
                    "reponse_eleve": reponse.reponse,
                    "reponse_attendue": question.reponse_attendue,
                    "similarite_semantique": similarite,
                    "ratio_points": ratio_points
                },
                methode_correction=f"Analyse sémantique ({SENTENCE_TRANSFORMER_MODEL})"
            )
            
        except Exception as e:
            # Fallback en cas d'erreur
            print(f"⚠ Erreur lors de l'analyse sémantique: {e}")
            return self._corriger_simple(question, reponse)    
    def _corriger_avec_llm_autonome(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """Correction autonome avec LLM pour questions courtes sans réponse attendue"""
        try:
            prompt = f"""Évalue cette réponse courte:

Question: {question.enonce}
Réponse élève: {reponse.reponse}
Points max: {question.points_max}

Donne:
- Note (0 à {question.points_max})
- Feedback court
- Réponse correcte

Format JSON strict:
{{"points": 0.0, "feedback": "texte", "reponse_correcte": "texte"}}"""

            response = ollama.chat(
                model=OLLAMA_MODEL,
                messages=[
                    {'role': 'system', 'content': 'Réponds en JSON valide uniquement.'},
                    {'role': 'user', 'content': prompt}
                ],
                options={'temperature': 0.2, 'num_predict': 200}
            )
            
            reponse_llm = response['message']['content'].strip()
            print(f"🔍 DEBUG LLM autonome réponse: {reponse_llm}")
            
            # Parser le JSON de manière robuste
            import json
            import re
            
            # Chercher le JSON (plusieurs stratégies)
            resultat = None
            
            # Stratégie 1: JSON direct
            try:
                resultat = json.loads(reponse_llm)
            except:
                pass
            
            # Stratégie 2: Extraire entre accolades (récursif)
            if not resultat:
                try:
                    # Trouver la première { et la dernière }
                    start = reponse_llm.find('{')
                    end = reponse_llm.rfind('}')
                    if start != -1 and end != -1:
                        json_str = reponse_llm[start:end+1]
                        resultat = json.loads(json_str)
                except:
                    pass
            
            # Stratégie 3: Extraction manuelle avec regex
            if not resultat:
                try:
                    points_match = re.search(r'"points":\s*([0-9.]+)', reponse_llm)
                    feedback_match = re.search(r'"feedback":\s*"([^"]*)"', reponse_llm)
                    reponse_match = re.search(r'"reponse_correcte":\s*"([^"]*)"', reponse_llm)
                    
                    if points_match:
                        resultat = {
                            'points': float(points_match.group(1)),
                            'feedback': feedback_match.group(1) if feedback_match else 'Analyse effectuée',
                            'reponse_correcte': reponse_match.group(1) if reponse_match else 'Voir analyse'
                        }
                except:
                    pass
            
            # Fallback: utiliser la réponse brute
            if not resultat:
                print(f"⚠ Impossible de parser le JSON, utilisation du fallback")
                points_obtenus = question.points_max * 0.5
                feedback_llm = reponse_llm[:200]
                reponse_correcte = "Analyse IA (format non structuré)"
            else:
                points_obtenus = float(resultat.get('points', 0))
                feedback_llm = resultat.get('feedback', 'Analyse effectuée')
                reponse_correcte = resultat.get('reponse_correcte', 'Voir feedback')
            
            # Limiter les points au maximum
            points_obtenus = min(max(0, points_obtenus), question.points_max)
            pourcentage = self.calculer_pourcentage(points_obtenus, question.points_max)
            
            feedback_final = f"🤖 {feedback_llm}\n\n✅ Réponse correcte suggérée par l'IA:\n{reponse_correcte}"
            
            return ResultatCorrection(
                question_id=question.id,
                points_obtenus=points_obtenus,
                points_max=question.points_max,
                pourcentage=pourcentage,
                est_correct=points_obtenus >= question.points_max * 0.7,
                feedback=feedback_final,
                details={
                    "reponse_eleve": reponse.reponse,
                    "reponse_ia": reponse_correcte,
                    "analyse_complete": reponse_llm
                },
                methode_correction=f"Évaluation LLM autonome ({OLLAMA_MODEL})"
            )
            
        except Exception as e:
            print(f"⚠ Erreur LLM autonome: {e}")
            # Fallback vers correction basique
            return self._corriger_simple(question, reponse)