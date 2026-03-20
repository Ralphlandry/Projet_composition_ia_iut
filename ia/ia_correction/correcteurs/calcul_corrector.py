"""
Correcteur pour les questions de calcul (mathématiques, physique)
"""

import re
from typing import Tuple, Optional
from .base_corrector import BaseCorrector
from ..models import Question, ReponseEleve, ResultatCorrection
from ..config import TOLERANCE_CALCUL_NUMERIQUE, TOLERANCE_CALCUL_SYMBOLIQUE

try:
    from sympy import sympify, simplify, N, symbols
    from sympy.parsing.sympy_parser import parse_expr
    SYMPY_AVAILABLE = True
except ImportError:
    SYMPY_AVAILABLE = False

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False


class CalculCorrector(BaseCorrector):
    """Correcteur spécialisé pour les calculs mathématiques et physiques"""
    
    def __init__(self):
        super().__init__()
        if not SYMPY_AVAILABLE:
            print("⚠ Warning: SymPy n'est pas installé. Correction numérique uniquement.")
    
    def _determiner_reponse_avec_ia(self, question: Question) -> str:
        """
        Utilise l'IA pour résoudre un problème de calcul
        """
        try:
            prompt = f"""Tu es un expert en mathématiques et physique. Résous ce problème de calcul.

Question: {question.enonce}

RÈGLES:
1. Donne UNIQUEMENT le résultat numérique final
2. Ne donne AUCUNE explication
3. Format: juste le nombre (ex: "9.8" ou "42")

Résultat:"""

            response = ollama.chat(
                model='llama3.2',
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.1}
            )
            
            reponse_ia = response['message']['content'].strip()
            
            # Extraire le nombre
            match = re.search(r'([-+]?[\d.]+(?:[eE][-+]?\d+)?)', reponse_ia)
            if match:
                resultat = match.group(1)
                print(f"  🤖 IA a calculé: {resultat}")
                return resultat
            
            print(f"  ⚠️ IA n'a pas pu calculer: {reponse_ia}")
            return ""
            
        except Exception as e:
            print(f"  ❌ Erreur IA pour calculer: {e}")
            return ""
    
    def corriger(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """
        Corrige une question de calcul
        Supporte:
        - Réponses numériques (avec tolérance)
        - Expressions symboliques (équivalence mathématique)
        - Unités physiques
        """
        
        # Si pas de réponse attendue, essayer de la calculer avec l'IA
        if not question.reponse_attendue or question.reponse_attendue.strip() == '':
            if OLLAMA_AVAILABLE:
                print(f"  🤖 Pas de réponse définie pour calcul, utilisation de l'IA...")
                question.reponse_attendue = self._determiner_reponse_avec_ia(question)
        
        # Si toujours pas de réponse attendue, impossible de corriger
        if not question.reponse_attendue or question.reponse_attendue.strip() == '':
            return ResultatCorrection(
                question_id=question.id,
                points_obtenus=0,
                points_max=question.points_max,
                pourcentage=0,
                est_correct=False,
                feedback="⚠️ Impossible de corriger automatiquement ce calcul. Correction manuelle requise.",
                details={
                    "reponse_eleve": reponse.reponse,
                    "erreur": "reponse_attendue non définie et IA n'a pas pu calculer"
                },
                methode_correction="calcul_echec"
            )
        
        # Nettoyer les réponses
        reponse_eleve_clean = self._nettoyer_expression(reponse.reponse)
        reponse_attendue_clean = self._nettoyer_expression(question.reponse_attendue)
        
        # Essayer correction symbolique d'abord
        if SYMPY_AVAILABLE and question.formule_symbolique:
            return self._corriger_symbolique(question, reponse_eleve_clean, reponse_attendue_clean)
        
        # Sinon correction numérique
        return self._corriger_numerique(question, reponse_eleve_clean, reponse_attendue_clean)
    
    def _nettoyer_expression(self, expression: str) -> str:
        """Nettoie une expression mathématique"""
        if not expression:
            return ""
        
        # Supprimer les espaces
        expr = expression.strip()
        
        # Remplacer les caractères spéciaux
        expr = expr.replace('×', '*').replace('÷', '/').replace('^', '**')
        
        # Extraire la valeur numérique si des unités sont présentes
        # Ex: "9.8 m/s²" -> "9.8"
        match = re.match(r'^([-+]?[\d.]+(?:[eE][-+]?\d+)?)', expr)
        if match:
            return match.group(1)
        
        return expr
    
    def _extraire_unite(self, expression: str) -> Optional[str]:
        """Extrait l'unité d'une expression"""
        # Ex: "9.8 m/s²" -> "m/s²"
        match = re.search(r'([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s*(.+)$', expression.strip())
        if match:
            return match.group(2).strip()
        return None
    
    def _corriger_numerique(self, question: Question, 
                           reponse_eleve: str, 
                           reponse_attendue: str) -> ResultatCorrection:
        """Correction numérique avec tolérance"""
        try:
            valeur_eleve = float(reponse_eleve)
            valeur_attendue = float(reponse_attendue)
            
            # Vérifier avec tolérance
            tolerance = question.tolerance or TOLERANCE_CALCUL_NUMERIQUE
            difference = abs(valeur_eleve - valeur_attendue)
            difference_relative = difference / abs(valeur_attendue) if valeur_attendue != 0 else difference
            
            est_correct = difference_relative <= tolerance
            
            # Calculer les points
            if est_correct:
                points_obtenus = question.points_max
                feedback = f"✓ Correct ! Résultat: {valeur_eleve}"
            elif difference_relative <= tolerance * 2:
                # Tolérance élargie pour points partiels
                points_obtenus = question.points_max * 0.7
                feedback = f"⚠ Approximativement correct. Résultat: {valeur_eleve}, attendu: {valeur_attendue}"
            else:
                points_obtenus = 0
                feedback = f"✗ Incorrect. Résultat: {valeur_eleve}, attendu: {valeur_attendue}"
            
            # Vérifier les unités
            unite_eleve = self._extraire_unite(question.reponse_attendue)
            unite_attendue = self._extraire_unite(question.reponse_attendue)
            
            if unite_attendue and unite_eleve != unite_attendue:
                points_obtenus *= 0.8  # Pénalité si unité incorrecte
                feedback += f"\n⚠ Unité incorrecte ou manquante. Attendu: {unite_attendue}"
            
            pourcentage = self.calculer_pourcentage(points_obtenus, question.points_max)
            
            return ResultatCorrection(
                question_id=question.id,
                points_obtenus=points_obtenus,
                points_max=question.points_max,
                pourcentage=pourcentage,
                est_correct=est_correct,
                feedback=feedback,
                details={
                    "valeur_eleve": valeur_eleve,
                    "valeur_attendue": valeur_attendue,
                    "difference": difference,
                    "difference_relative": difference_relative,
                    "tolerance": tolerance
                },
                methode_correction="Comparaison numérique avec tolérance"
            )
            
        except (ValueError, TypeError) as e:
            return ResultatCorrection(
                question_id=question.id,
                points_obtenus=0,
                points_max=question.points_max,
                pourcentage=0,
                est_correct=False,
                feedback=f"✗ Erreur: Réponse non numérique valide. {str(e)}",
                details={"erreur": str(e)},
                methode_correction="Comparaison numérique avec tolérance"
            )
    
    def _corriger_symbolique(self, question: Question,
                            reponse_eleve: str,
                            reponse_attendue: str) -> ResultatCorrection:
        """Correction symbolique avec SymPy"""
        try:
            # Parser les expressions
            expr_eleve = sympify(reponse_eleve)
            expr_attendue = sympify(reponse_attendue)
            
            # Simplifier et comparer
            diff = simplify(expr_eleve - expr_attendue)
            
            # Vérifier si la différence est zéro (expressions équivalentes)
            est_correct = diff == 0
            
            if est_correct:
                points_obtenus = question.points_max
                feedback = f"✓ Correct ! Expression équivalente à {reponse_attendue}"
            else:
                # Essayer évaluation numérique pour expressions presque équivalentes
                try:
                    diff_numerique = abs(float(N(diff)))
                    if diff_numerique < TOLERANCE_CALCUL_NUMERIQUE:
                        points_obtenus = question.points_max * 0.9
                        feedback = f"⚠ Approximativement correct (différence numérique minime)"
                        est_correct = True
                    else:
                        points_obtenus = 0
                        feedback = f"✗ Incorrect. Expression reçue: {expr_eleve}, attendue: {expr_attendue}"
                except:
                    points_obtenus = 0
                    feedback = f"✗ Incorrect. Expression reçue: {expr_eleve}, attendue: {expr_attendue}"
            
            pourcentage = self.calculer_pourcentage(points_obtenus, question.points_max)
            
            return ResultatCorrection(
                question_id=question.id,
                points_obtenus=points_obtenus,
                points_max=question.points_max,
                pourcentage=pourcentage,
                est_correct=est_correct,
                feedback=feedback,
                details={
                    "expression_eleve": str(expr_eleve),
                    "expression_attendue": str(expr_attendue),
                    "expression_simplifiee": str(simplify(expr_eleve))
                },
                methode_correction="Comparaison symbolique (SymPy)"
            )
            
        except Exception as e:
            # Fallback vers correction numérique
            return self._corriger_numerique(question, reponse_eleve, reponse_attendue)
