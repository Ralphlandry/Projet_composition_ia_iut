"""
Exemple d'utilisation du système de correction automatique
"""

from ia_correction.engine import CorrectionEngine
from ia_correction.models import (
    Question, ReponseEleve, Evaluation, CopieEleve,
    TypeQuestion, Matiere
)


def exemple_qcm():
    """Exemple de correction d'un QCM"""
    print("\n" + "="*60)
    print("EXEMPLE 1: CORRECTION QCM")
    print("="*60)
    
    engine = CorrectionEngine()
    
    # Créer une question QCM
    question = Question(
        id="q1",
        type=TypeQuestion.QCM,
        matiere=Matiere.RESEAU,
        enonce="Quel protocole utilise le port 80 par défaut?",
        points_max=2.0,
        reponse_attendue="B",
        options=["A. FTP", "B. HTTP", "C. SMTP", "D. SSH"]
    )
    
    # Réponse de l'élève (correcte)
    reponse = ReponseEleve(
        question_id="q1",
        reponse="B"
    )
    
    # Corriger
    resultat = engine.corriger_question(question, reponse)
    
    print(f"\nQuestion: {question.enonce}")
    print(f"Réponse élève: {reponse.reponse}")
    print(f"Résultat: {resultat.points_obtenus}/{resultat.points_max} pts")
    print(f"Feedback: {resultat.feedback}")


def exemple_calcul():
    """Exemple de correction d'un calcul"""
    print("\n" + "="*60)
    print("EXEMPLE 2: CORRECTION CALCUL PHYSIQUE")
    print("="*60)
    
    engine = CorrectionEngine()
    
    # Question de calcul
    question = Question(
        id="q2",
        type=TypeQuestion.CALCUL,
        matiere=Matiere.PHYSIQUE,
        enonce="Calculez la vitesse (en m/s) d'un objet parcourant 100m en 10s",
        points_max=3.0,
        reponse_attendue="10",
        tolerance=0.1
    )
    
    # Réponse de l'élève
    reponse = ReponseEleve(
        question_id="q2",
        reponse="10.0"
    )
    
    # Corriger
    resultat = engine.corriger_question(question, reponse)
    
    print(f"\nQuestion: {question.enonce}")
    print(f"Réponse élève: {reponse.reponse}")
    print(f"Résultat: {resultat.points_obtenus}/{resultat.points_max} pts")
    print(f"Feedback: {resultat.feedback}")


def exemple_question_courte():
    """Exemple de correction d'une question courte"""
    print("\n" + "="*60)
    print("EXEMPLE 3: CORRECTION QUESTION COURTE (IA Sémantique)")
    print("="*60)
    
    engine = CorrectionEngine()
    
    # Question courte
    question = Question(
        id="q3",
        type=TypeQuestion.COURTE,
        matiere=Matiere.RESEAU,
        enonce="Qu'est-ce qu'une adresse IP?",
        points_max=4.0,
        reponse_attendue="Une adresse IP est un identifiant unique attribué à chaque appareil connecté à un réseau informatique"
    )
    
    # Réponse de l'élève (formulée différemment mais correcte)
    reponse = ReponseEleve(
        question_id="q3",
        reponse="C'est un numéro unique qui permet d'identifier un ordinateur sur un réseau"
    )
    
    # Corriger
    resultat = engine.corriger_question(question, reponse)
    
    print(f"\nQuestion: {question.enonce}")
    print(f"Réponse élève: {reponse.reponse}")
    print(f"Résultat: {resultat.points_obtenus}/{resultat.points_max} pts")
    print(f"Feedback: {resultat.feedback}")


def exemple_copie_complete():
    """Exemple de correction d'une copie complète"""
    print("\n" + "="*60)
    print("EXEMPLE 4: CORRECTION COPIE COMPLÈTE")
    print("="*60)
    
    engine = CorrectionEngine()
    
    # Créer une évaluation avec plusieurs questions
    evaluation = Evaluation(
        id="eval1",
        titre="Évaluation Réseau - Niveau IUT",
        matiere=Matiere.RESEAU,
        duree_minutes=60,
        bareme_total=20,
        questions=[
            Question(
                id="q1",
                type=TypeQuestion.QCM,
                matiere=Matiere.RESEAU,
                enonce="Le modèle OSI comporte combien de couches?",
                points_max=2.0,
                reponse_attendue="C",
                options=["A. 5", "B. 6", "C. 7", "D. 8"]
            ),
            Question(
                id="q2",
                type=TypeQuestion.CALCUL,
                matiere=Matiere.RESEAU,
                enonce="Calculez le nombre d'hôtes possibles pour un réseau /24",
                points_max=3.0,
                reponse_attendue="254",
                tolerance=0
            ),
            Question(
                id="q3",
                type=TypeQuestion.COURTE,
                matiere=Matiere.RESEAU,
                enonce="Expliquez brièvement le rôle d'un routeur",
                points_max=5.0,
                reponse_attendue="Un routeur est un équipement réseau qui permet de diriger les paquets de données entre différents réseaux"
            ),
            Question(
                id="q4",
                type=TypeQuestion.QCM,
                matiere=Matiere.RESEAU,
                enonce="Quel protocole est utilisé pour la résolution de noms de domaine?",
                points_max=2.0,
                reponse_attendue="A",
                options=["A. DNS", "B. DHCP", "C. HTTP", "D. FTP"]
            ),
            Question(
                id="q5",
                type=TypeQuestion.LONGUE,
                matiere=Matiere.RESEAU,
                enonce="Décrivez les différences entre les protocoles TCP et UDP et donnez un exemple d'utilisation pour chacun",
                points_max=8.0,
                reponse_attendue="TCP est un protocole fiable avec contrôle d'erreur et garantie de livraison, utilisé pour HTTP, FTP. UDP est plus rapide mais sans garantie, utilisé pour streaming vidéo, jeux en ligne.",
                criteres_evaluation=[
                    "Fiabilité de TCP",
                    "Rapidité de UDP",
                    "Exemples pertinents",
                    "Clarté de l'explication"
                ]
            )
        ]
    )
    
    # Copie d'un élève
    copie = CopieEleve(
        evaluation_id="eval1",
        eleve_id="e001",
        eleve_nom="Marie DUPONT",
        reponses=[
            ReponseEleve(question_id="q1", reponse="C"),  # Correct
            ReponseEleve(question_id="q2", reponse="254"),  # Correct
            ReponseEleve(question_id="q3", reponse="Le routeur sert à connecter plusieurs réseaux ensemble"),  # Partiellement correct
            ReponseEleve(question_id="q4", reponse="A"),  # Correct
            ReponseEleve(question_id="q5", reponse="TCP garantit la livraison des données et vérifie les erreurs, c'est utilisé pour les sites web. UDP est plus rapide mais peut perdre des données, utilisé pour les vidéos en streaming.")  # Bonne réponse
        ]
    )
    
    # Corriger la copie
    resultat = engine.corriger_copie(evaluation, copie)
    
    # Afficher les résultats
    print(f"\nÉlève: {resultat.copie.eleve_nom}")
    print(f"Note finale: {resultat.note_totale:.1f}/{resultat.note_max}")
    print(f"Pourcentage: {resultat.pourcentage_global:.1f}%")
    print(f"Appréciation: {resultat.appreciation}")
    
    print("\nDétail par question:")
    for i, res in enumerate(resultat.resultats, 1):
        print(f"\n  Question {i}:")
        print(f"    Points: {res.points_obtenus:.1f}/{res.points_max}")
        print(f"    Feedback: {res.feedback}")


def exemple_classe_complete():
    """Exemple de correction pour toute une classe"""
    print("\n" + "="*60)
    print("EXEMPLE 5: CORRECTION CLASSE COMPLÈTE")
    print("="*60)
    
    engine = CorrectionEngine()
    
    # Évaluation simplifiée
    evaluation = Evaluation(
        id="eval2",
        titre="Contrôle Continu - Mathématiques",
        matiere=Matiere.MATHEMATIQUES,
        duree_minutes=30,
        bareme_total=10,
        questions=[
            Question(
                id="q1",
                type=TypeQuestion.QCM,
                matiere=Matiere.MATHEMATIQUES,
                enonce="Combien vaut π (arrondi à 2 décimales)?",
                points_max=2.0,
                reponse_attendue="B",
                options=["A. 3.12", "B. 3.14", "C. 3.16", "D. 3.18"]
            ),
            Question(
                id="q2",
                type=TypeQuestion.CALCUL,
                matiere=Matiere.MATHEMATIQUES,
                enonce="Calculez: 15 × 7",
                points_max=3.0,
                reponse_attendue="105"
            ),
            Question(
                id="q3",
                type=TypeQuestion.COURTE,
                matiere=Matiere.MATHEMATIQUES,
                enonce="Qu'est-ce qu'un nombre premier?",
                points_max=5.0,
                reponse_attendue="Un nombre entier supérieur à 1 qui n'est divisible que par 1 et par lui-même"
            )
        ]
    )
    
    # Copies de plusieurs élèves
    copies = [
        CopieEleve(
            evaluation_id="eval2",
            eleve_id="e001",
            eleve_nom="Alice MARTIN",
            reponses=[
                ReponseEleve(question_id="q1", reponse="B"),
                ReponseEleve(question_id="q2", reponse="105"),
                ReponseEleve(question_id="q3", reponse="Un nombre qui n'est divisible que par 1 et lui-même")
            ]
        ),
        CopieEleve(
            evaluation_id="eval2",
            eleve_id="e002",
            eleve_nom="Bob DURAND",
            reponses=[
                ReponseEleve(question_id="q1", reponse="A"),  # Faux
                ReponseEleve(question_id="q2", reponse="105"),
                ReponseEleve(question_id="q3", reponse="Un nombre spécial")  # Insuffisant
            ]
        ),
        CopieEleve(
            evaluation_id="eval2",
            eleve_id="e003",
            eleve_nom="Claire BERNARD",
            reponses=[
                ReponseEleve(question_id="q1", reponse="B"),
                ReponseEleve(question_id="q2", reponse="104"),  # Faux
                ReponseEleve(question_id="q3", reponse="C'est un entier supérieur à 1 divisible uniquement par 1 et par lui-même")
            ]
        )
    ]
    
    # Corriger toutes les copies
    resultats = engine.corriger_plusieurs_copies(evaluation, copies)
    
    # Afficher un résumé
    print("\n📋 RÉSUMÉ DES NOTES:")
    for res in resultats:
        print(f"  {res.copie.eleve_nom}: {res.note_totale:.1f}/{res.note_max} ({res.pourcentage_global:.0f}%)")


if __name__ == "__main__":
    print("\n🎓 EXEMPLES D'UTILISATION DU SYSTÈME DE CORRECTION IA")
    print("=" * 60)
    
    # Exécuter tous les exemples
    exemple_qcm()
    exemple_calcul()
    exemple_question_courte()
    exemple_copie_complete()
    exemple_classe_complete()
    
    print("\n" + "="*60)
    print("✅ Tous les exemples ont été exécutés avec succès!")
    print("="*60)
