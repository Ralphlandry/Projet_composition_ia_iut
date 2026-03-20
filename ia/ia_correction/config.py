"""
Configuration du système de correction IA
"""

# Modèles NLP
SENTENCE_TRANSFORMER_MODEL = "paraphrase-multilingual-mpnet-base-v2"
SPACY_MODEL = "fr_core_news_md"

# Modèle LLM pour questions longues
OLLAMA_MODEL = "llama3.2"  # ou "mistral" ou "llama3.1"
OLLAMA_HOST = "http://localhost:11434"

# Seuils de similarité
SIMILARITE_EXCELLENTE = 0.85  # >= 95% des points
SIMILARITE_BONNE = 0.70       # >= 70% des points
SIMILARITE_MOYENNE = 0.50     # >= 50% des points
SIMILARITE_FAIBLE = 0.30      # >= 30% des points

# Tolérance pour calculs mathématiques
TOLERANCE_CALCUL_NUMERIQUE = 0.01
TOLERANCE_CALCUL_SYMBOLIQUE = True

# Paramètres de correction
MAX_POINTS_QCM = 1
PENALITE_MAUVAISE_REPONSE = 0  # Peut être ajusté

# Temps d'exécution maximum
TIMEOUT_LLM = 60  # secondes
TIMEOUT_CALCUL = 5  # secondes
