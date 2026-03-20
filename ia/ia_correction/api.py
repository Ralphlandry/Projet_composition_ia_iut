"""
API FastAPI pour le système de correction automatique
"""

from typing import List, Optional
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import PyPDF2
import io
import json
import re

from .engine import CorrectionEngine
from .models import (
    Question, ReponseEleve, ResultatCorrection,
    Evaluation, CopieEleve, ResultatEvaluation
)

# Initialiser l'application FastAPI
app = FastAPI(
    title="Système de Correction Automatique IA",
    description="API de correction automatique pour QCM, calculs, questions courtes et longues",
    version="1.0.0"
)

# Configurer CORS pour permettre les requêtes depuis votre plateforme web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialiser le moteur de correction
engine = CorrectionEngine()


# ============================================================================
# ROUTES DE L'API
# ============================================================================

@app.get("/")
async def root():
    """Page d'accueil de l'API"""
    return {
        "message": "Système de Correction Automatique IA",
        "version": "1.0.0",
        "endpoints": {
            "corriger_question": "/api/corriger-question",
            "corriger_copie": "/api/corriger-copie",
            "corriger_copies": "/api/corriger-copies",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Vérification de l'état de l'API"""
    return {
        "status": "healthy",
        "moteur": "opérationnel",
        "modules": {
            "qcm": True,
            "calcul": True,
            "courte": engine.courte_corrector.model is not None,
            "longue": engine.longue_corrector.ollama_disponible
        }
    }


@app.post("/api/corriger-question", response_model=ResultatCorrection)
async def corriger_question(question: Question, reponse: ReponseEleve):
    """
    Corrige une question unique
    
    **Exemple de requête:**
    ```json
    {
        "question": {
            "id": "q1",
            "type": "qcm",
            "matiere": "reseau",
            "enonce": "Quel protocole utilise le port 80?",
            "points_max": 2,
            "reponse_attendue": "B",
            "options": ["FTP", "HTTP", "SMTP", "SSH"]
        },
        "reponse": {
            "question_id": "q1",
            "reponse": "B"
        }
    }
    ```
    """
    try:
        resultat = engine.corriger_question(question, reponse)
        return resultat
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la correction: {str(e)}"
        )


@app.post("/api/corriger-copie", response_model=ResultatEvaluation)
async def corriger_copie(evaluation: Evaluation, copie: CopieEleve):
    """
    Corrige une copie complète d'un élève
    
    **Paramètres:**
    - evaluation: L'évaluation avec toutes les questions
    - copie: La copie de l'élève avec toutes ses réponses
    
    **Retourne:**
    - ResultatEvaluation avec la note finale et tous les détails
    """
    try:
        resultat = engine.corriger_copie(evaluation, copie)
        return resultat
    except Exception as e:
        import traceback
        print(f"❌ ERREUR CORRECTION: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la correction: {str(e)}"
        )


@app.post("/api/corriger-copies", response_model=List[ResultatEvaluation])
async def corriger_copies(evaluation: Evaluation, copies: List[CopieEleve]):
    """
    Corrige plusieurs copies pour une même évaluation
    
    **Utile pour:**
    - Corriger toutes les copies d'une classe
    - Générer des statistiques de classe
    """
    try:
        resultats = engine.corriger_plusieurs_copies(evaluation, copies)
        return resultats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la correction: {str(e)}"
        )


@app.get("/api/stats-classe")
async def obtenir_statistiques(resultats: List[ResultatEvaluation]):
    """
    Calcule des statistiques pour une classe
    """
    if not resultats:
        return {"message": "Aucun résultat fourni"}
    
    notes = [r.note_totale for r in resultats]
    pourcentages = [r.pourcentage_global for r in resultats]
    
    return {
        "nb_eleves": len(resultats),
        "moyenne": sum(notes) / len(notes),
        "note_min": min(notes),
        "note_max": max(notes),
        "pourcentage_moyen": sum(pourcentages) / len(pourcentages),
        "repartition": {
            "excellent": sum(1 for p in pourcentages if p >= 75),
            "bon": sum(1 for p in pourcentages if 50 <= p < 75),
            "insuffisant": sum(1 for p in pourcentages if p < 50)
        }
    }


# ============================================================================
# ROUTES UTILITAIRES
# ============================================================================

@app.get("/api/types-questions")
async def lister_types_questions():
    """Liste tous les types de questions supportés"""
    return {
        "types_supportes": [
            {
                "type": "qcm",
                "description": "Questions à choix multiples",
                "methode": "Comparaison directe"
            },
            {
                "type": "calcul",
                "description": "Questions de calcul mathématique/physique",
                "methode": "Vérification symbolique ou numérique (SymPy)"
            },
            {
                "type": "courte",
                "description": "Questions à réponse courte",
                "methode": "Analyse sémantique (Sentence Transformers)"
            },
            {
                "type": "longue",
                "description": "Questions à développement",
                "methode": "Évaluation par LLM (Ollama)"
            }
        ]
    }


@app.get("/api/matieres")
async def lister_matieres():
    """Liste toutes les matières supportées"""
    return {
        "matieres": [
            "mathematiques",
            "physique",
            "reseau",
            "informatique",
            "autre"
        ]
    }


@app.post("/api/extraire-questions-pdf")
async def extraire_questions_pdf(file: UploadFile = File(...)):
    """
    Extrait automatiquement les questions d'un PDF d'épreuve
    
    **Retourne:**
    - Liste de questions détectées avec leurs réponses attendues
    - Type de question inféré (qcm, courte, longue)
    """
    try:
        # Lire le contenu du PDF
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        
        # Extraire le texte de toutes les pages
        texte_complet = ""
        for page in pdf_reader.pages:
            texte_complet += page.extract_text() + "\n"
        
        if not texte_complet.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le PDF ne contient pas de texte extractible"
            )
        
        # Utiliser le LLM pour extraire les questions structurées
        questions_extraites = await _extraire_questions_avec_ia(texte_complet)
        
        return {
            "success": True,
            "nb_questions": len(questions_extraites),
            "questions": questions_extraites,
            "texte_brut": texte_complet[:500] + "..."  # Aperçu
        }
        
    except PyPDF2.errors.PdfReadError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de lire le fichier PDF"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'extraction: {str(e)}"
        )


async def _extraire_questions_avec_ia(texte: str) -> List[dict]:
    """
    Utilise le LLM Ollama pour extraire intelligemment les questions du texte
    ET générer automatiquement les réponses attendues
    """
    # Si Ollama n'est pas disponible, utiliser une extraction par regex basique
    if not engine.longue_corrector.ollama_disponible:
        return _extraire_questions_regex(texte)
    
    try:
        import ollama
        from .config import OLLAMA_MODEL
        
        # Prompt ultra-simplifié pour vitesse maximale
        prompt = f"""Extrait UNIQUEMENT les 10 premières questions de ce PDF.

{texte[:1500]}

RÈGLES STRICTES:
1. question_text: SEULEMENT la question, SANS les options (ex: "Quel est le protocole réseau utilisé pour Internet ?")
2. options: LISTE SÉPARÉE des options (ex: ["a) TCP", "b) IP", "c) IPX"])
3. question_type: "qcm", "vrai_faux", "reponse_courte" ou "redaction"
4. correct_answer: ex "a)" pour QCM, "Vrai" pour V/F
5. points: 1

Format JSON STRICT:
{{"questions": [{{"question_text": "Quelle est...", "options": ["a) opt1", "b) opt2"], "question_type": "qcm", "correct_answer": "a)", "points": 1}}]}}"""
        
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={'temperature': 0.1, 'num_predict': 400}  # Très court = rapide
        )
        
        # Parser la réponse JSON
        contenu = response['message']['content']
        
        # Extraire le JSON
        json_match = re.search(r'\{.*\}', contenu, re.DOTALL)
        if json_match:
            contenu = json_match.group()
        
        data = json.loads(contenu)
        questions = data.get('questions', [])
        
        print(f"📋 Reçu {len(questions)} questions du LLM")
        
        # Post-traitement: FORCER l'extraction des options depuis question_text
        for idx, q in enumerate(questions):
            question_text = q.get('question_text', '')
            original_options = q.get('options', [])
            
            print(f"\n🔍 Question {idx+1}:")
            print(f"   Texte brut: {question_text[:100]}...")
            print(f"   Options reçues du LLM: {original_options}")
            
            # Si le LLM a bien séparé les options ET le texte ne contient pas "a)" ou "b)"
            if (isinstance(original_options, list) and 
                len(original_options) >= 2 and 
                not re.search(r'[a-dA-D]\s*\)', question_text)):
                print(f"   ✅ Options déjà correctement séparées")
                continue
            
            # SINON: extraire les options du texte avec un regex ULTRA-ROBUSTE
            # Gérer les \n, espaces multiples, etc.
            # Pattern: lettre (a-d) + ) + texte jusqu'à la prochaine option ou fin
            pattern = r'([a-dA-D])\s*\)\s*([^\n]+?)(?=\s*[a-dA-D]\s*\)|$)'
            matches = re.findall(pattern, question_text, re.DOTALL)
            
            if matches and len(matches) >= 2:
                # Extraire les options
                extracted_options = [f"{letter.lower()}) {text.strip()}" for letter, text in matches]
                q['options'] = extracted_options
                
                # Nettoyer question_text: tout avant la première option
                first_option_pos = re.search(r'[a-dA-D]\s*\)', question_text)
                if first_option_pos:
                    clean_question = question_text[:first_option_pos.start()].strip()
                    clean_question = re.sub(r'\s*\?\s*$', '?', clean_question)
                    q['question_text'] = clean_question
                
                # Forcer type QCM
                q['question_type'] = 'qcm'
                
                print(f"   ✅ Extrait {len(extracted_options)} options")
                print(f"   📝 Question nettoyée: {q['question_text']}")
                print(f"   🎯 Options: {extracted_options}")
            else:
                # Aucune option détectée
                if not isinstance(q.get('options'), list):
                    q['options'] = []
                print(f"   ⚠️ Aucune option détectée - type: {q.get('question_type')}")
        
        print(f"✅ {len(questions)} questions extraites avec réponses générées")
        for q in questions:
            if q.get('question_type') == 'qcm' and q.get('options'):
                print(f"  - QCM: {len(q['options'])} options")
        
        return questions
        
    except Exception as e:
        print(f"⚠ Erreur IA ({e}), fallback sur regex")
        return _extraire_questions_regex(texte)


def _extraire_questions_regex(texte: str) -> List[dict]:
    """
    Extraction basique par regex quand l'IA n'est pas disponible
    """
    questions = []
    
    # Détecter les exercices/sections pour traiter chacun individuellement
    exercices = re.split(r'(Exercice\s+\d+\s*:.*?)(?=Exercice\s+\d+|$)', texte, flags=re.IGNORECASE | re.DOTALL)
    
    # Si pas d'exercices détectés, traiter le texte comme un seul bloc
    if len(exercices) <= 1:
        exercices = [texte]
    
    for exercice_texte in exercices:
        if not exercice_texte.strip() or len(exercice_texte.strip()) < 20:
            continue
        
        # Patterns pour détecter les questions numérotées
        patterns = [
            r'(\d+)\.\s+(.+?)(?=\d+\.|Exercice|$)',  # 1. Question...
            r'Question\s*(\d+)\s*[:\-]?\s*(.+?)(?=Question\s*\d+|Exercice|$)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, exercice_texte, re.DOTALL | re.IGNORECASE)
            for match in matches:
                question_text = match.group(2).strip()
                
                # Limiter la longueur pour éviter de capturer trop de texte
                if len(question_text) > 500:
                    question_text = question_text[:500] + "..."
                
                # Ignorer les lignes trop courtes (titres, etc.)
                if len(question_text.strip()) < 15:
                    continue
                
                # ANALYSE INDIVIDUELLE DE CHAQUE QUESTION
                question_type = _detecter_type_question(question_text)
                
                # Extraire les points si mentionnés
                points_match = re.search(r'(\d+)\s*points?', question_text, re.IGNORECASE)
                points = int(points_match.group(1)) if points_match else 1
                
                # EXTRAIRE LES OPTIONS pour les QCM
                options = []
                clean_question = question_text
                if question_type == 'qcm':
                    # Pattern: lettre (a-d) + ) + texte jusqu'à la prochaine option ou fin
                    pattern = r'([a-dA-D])\s*\)\s*([^\n]+?)(?=\s*[a-dA-D]\s*\)|$)'
                    matches = re.findall(pattern, question_text, re.DOTALL)
                    
                    if matches and len(matches) >= 2:
                        # Extraire les options
                        options = [f"{letter.lower()}) {text.strip()}" for letter, text in matches]
                        
                        # Nettoyer question_text: tout avant la première option
                        first_option_pos = re.search(r'[a-dA-D]\s*\)', question_text)
                        if first_option_pos:
                            clean_question = question_text[:first_option_pos.start()].strip()
                
                questions.append({
                    "question_text": clean_question,
                    "question_type": question_type,
                    "options": options,
                    "correct_answer": "",
                    "points": points
                })
            
            if questions:  # Si on a trouvé des questions dans cet exercice
                break
    
    return questions


def _detecter_type_question(texte_question: str) -> str:
    """
    Détecte le type d'une question en analysant son contenu individuellement
    ORDRE DE PRIORITÉ: QCM > Vrai/Faux > Rédaction > Réponse courte
    """
    texte_lower = texte_question.lower()
    texte_clean = re.sub(r'\s+', ' ', texte_lower).strip()
    
    # 1. QCM - Présence d'options A), B), C), D) ou a), b), c), d)
    patterns_qcm = [
        r'\b[A-D]\)\s*[^\n]{2,}',  # A) avec au moins 2 caractères après
        r'\b[a-d]\)\s*[^\n]{2,}',  # a) avec au moins 2 caractères après
        r'\bOption\s+[A-D]',       # Option A, Option B...
        r'\b[A-D]\s*[\.:]\s*[^\n]{3,}'  # A. ou A: avec texte
    ]
    for pattern in patterns_qcm:
        if re.search(pattern, texte_question, re.IGNORECASE):
            return "qcm"
    
    # 2. Vrai/Faux - Détection stricte
    # Patterns qui indiquent CLAIREMENT une question vrai/faux
    patterns_vf_explicites = [
        r'(vrai|faux)\s*\?',                          # "vrai ? faux ?" 
        r'(vraie?|fausse?)\s*\?',                     # "vraie ?" ou "fausse ?"
        r'\b(est[-\s]ce)?\s*(vrai|faux)\s*ou\s*(faux|vrai)',  # "vrai ou faux" / "est-ce vrai ou faux"
        r'indiquer?\s+si.*\b(vrai|faux)\b',          # "indiquer si...vrai"
        r'dire?\s+si.*\b(vrai|faux)\b',              # "dire si...vrai"
        r'cocher?\s+(vrai|faux)',                     # "cocher vrai ou faux"
        r'\b(v|f)\s*/\s*(f|v)\b',                    # V/F ou F/V
        r'répondre?\s+par\s+(vrai|faux)',            # "répondre par vrai ou faux"
        r'affirmation.*\b(vraie?|fausse?)\b'         # "l'affirmation est vraie"
    ]
    
    for pattern in patterns_vf_explicites:
        if re.search(pattern, texte_lower):
            # Vérifier que ce n'est pas une question avec justification obligatoire
            if not re.search(r'\b(justif|expliqu|pourquoi|développ|argument)\w*', texte_lower):
                return "vrai_faux"
            # Si justification demandée, c'est une rédaction
            return "redaction"
    
    # 3. Rédaction/Développement - Mots-clés exigeant un développement
    mots_cles_redaction = [
        r'\brédige[rz]?\b', r'\bdéveloppe[rz]?\b', r'\bexplique[rz]?\b', 
        r'\bjustifie[rz]?\b', r'\bargumente[rz]?\b', r'\bcommente[rz]?\b',
        r'\banalyse[rz]?\b', r'\bdiscute[rz]?\b', r'\bdémontrer?\b',
        r'\bsynthèse\b', r'\brésumé\b', r'\bcomparer?\b', r'\bcontraste[rz]?\b',
        r'\b(10|15|20|25|30)\s+lignes?\b',           # "15 lignes maximum"
        r'\b(2|3|4|5)\s+paragraphes?\b',             # "3 paragraphes"
        r'\bpourquoi\b.*\?',                          # Questions "pourquoi"
        r'\bcomment\b.*\?',                           # Questions "comment"
        r'\ben\s+quoi\b',                             # "en quoi..."
        r'\bde\s+quelle\s+manière\b',                # "de quelle manière"
        r'\bdonnez?\s+votre\s+(avis|opinion)\b'      # "donnez votre avis"
    ]
    
    for motif in mots_cles_redaction:
        if re.search(motif, texte_lower):
            return "redaction"
    
    # 4. Rédaction si texte très long (probablement un développement attendu)
    if len(texte_question) > 400:
        return "redaction"
    
    # 5. Réponse courte - Patterns typiques
    patterns_courte = [
        r'\b(donner?|citer?|nommer?|lister?|identifier?)\b',
        r'\b(quel|quelle|quels|quelles)\b.*\?',
        r'\bdéfinition\b',
        r'\b(qui|où|quand)\b.*\?',
        r"^qu['\']est[-\s]ce\s+que?\b"
    ]
    
    for pattern in patterns_courte:
        if re.search(pattern, texte_lower):
            return "reponse_courte"
    
    # 6. Par défaut : Réponse courte (questions courtes générales)
    return "reponse_courte"


if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Démarrage du serveur API de correction...")
    print("📖 Documentation disponible sur: http://localhost:8000/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True
    )
