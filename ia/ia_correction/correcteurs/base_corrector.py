"""
Classe de base pour tous les correcteurs
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
from ..models import Question, ReponseEleve, ResultatCorrection


class BaseCorrector(ABC):
    """Classe abstraite pour les correcteurs"""
    
    def __init__(self):
        self.nom = self.__class__.__name__
    
    @abstractmethod
    def corriger(self, question: Question, reponse: ReponseEleve) -> ResultatCorrection:
        """
        Corrige une réponse et retourne le résultat
        
        Args:
            question: La question posée
            reponse: La réponse de l'élève
            
        Returns:
            ResultatCorrection avec la note et le feedback
        """
        pass
    
    def calculer_pourcentage(self, points_obtenus: float, points_max: float) -> float:
        """Calcule le pourcentage de réussite"""
        if points_max == 0:
            return 0.0
        return round((points_obtenus / points_max) * 100, 2)
    
    def generer_appreciation(self, pourcentage: float) -> str:
        """Génère une appréciation selon le pourcentage"""
        if pourcentage >= 90:
            return "Excellent"
        elif pourcentage >= 75:
            return "Très bien"
        elif pourcentage >= 60:
            return "Bien"
        elif pourcentage >= 50:
            return "Assez bien"
        elif pourcentage >= 40:
            return "Passable"
        else:
            return "Insuffisant"
