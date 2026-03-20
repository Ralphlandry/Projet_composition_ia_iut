"""
Guide de démarrage rapide - Système de Correction IA
Exécutez ce script pour tester rapidement le système
"""

import sys
import subprocess


def check_dependencies():
    """Vérifie les dépendances principales"""
    print(" Vérification des dépendances...\n")
    
    dependencies = {
        "fastapi": "Framework web",
        "pydantic": "Validation de données",
        "sympy": "Calculs mathématiques",
        "sentence_transformers": "IA sémantique (optionnel)",
        "ollama": "LLM local (optionnel)"
    }
    
    missing = []
    
    for package, description in dependencies.items():
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package}: {description}")
        except ImportError:
            print(f"✗ {package}: {description} - MANQUANT")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Packages manquants: {', '.join(missing)}")
        print("\n💡 Pour installer:")
        print("   pip install -r requirements.txt")
        return False
    
    print("\n✓ Toutes les dépendances principales sont installées!")
    return True


def test_basic_correction():
    """Test basique sans dépendances IA"""
    print("\n" + "="*60)
    print("TEST 1: Correction QCM (sans dépendances IA)")
    print("="*60)
    
    try:
        from ia_correction.engine import CorrectionEngine
        from ia_correction.models import Question, ReponseEleve, TypeQuestion, Matiere
        
        engine = CorrectionEngine()
        
        question = Question(
            id="test1",
            type=TypeQuestion.QCM,
            matiere=Matiere.RESEAU,
            enonce="Test: 2 + 2 = ?",
            points_max=1.0,
            reponse_attendue="C",
            options=["A. 3", "B. 5", "C. 4", "D. 6"]
        )
        
        reponse = ReponseEleve(question_id="test1", reponse="C")
        resultat = engine.corriger_question(question, reponse)
        
        print(f"✓ Note obtenue: {resultat.points_obtenus}/{resultat.points_max}")
        print(f"✓ {resultat.feedback}")
        return True
        
    except Exception as e:
        print(f"✗ Erreur: {e}")
        return False


def test_calcul_correction():
    """Test de correction de calculs"""
    print("\n" + "="*60)
    print("TEST 2: Correction Calcul (avec SymPy)")
    print("="*60)
    
    try:
        from ia_correction.engine import CorrectionEngine
        from ia_correction.models import Question, ReponseEleve, TypeQuestion, Matiere
        
        engine = CorrectionEngine()
        
        question = Question(
            id="test2",
            type=TypeQuestion.CALCUL,
            matiere=Matiere.MATHEMATIQUES,
            enonce="Calculez 15 × 8",
            points_max=2.0,
            reponse_attendue="120",
            tolerance=0.01
        )
        
        reponse = ReponseEleve(question_id="test2", reponse="120")
        resultat = engine.corriger_question(question, reponse)
        
        print(f"✓ Note obtenue: {resultat.points_obtenus}/{resultat.points_max}")
        print(f"✓ {resultat.feedback}")
        return True
        
    except Exception as e:
        print(f"✗ Erreur: {e}")
        return False


def test_api_availability():
    """Vérifie si l'API peut démarrer"""
    print("\n" + "="*60)
    print("TEST 3: Disponibilité de l'API")
    print("="*60)
    
    try:
        from ia_correction.api import app
        print("✓ API FastAPI chargée avec succès")
        print("💡 Pour démarrer l'API:")
        print("   python -m ia_correction.api")
        print("   ou")
        print("   uvicorn ia_correction.api:app --reload")
        return True
    except Exception as e:
        print(f"✗ Erreur lors du chargement de l'API: {e}")
        return False


def show_next_steps():
    """Affiche les prochaines étapes"""
    print("\n" + "="*60)
    print("🎯 PROCHAINES ÉTAPES")
    print("="*60)
    
    print("\n1️⃣  TESTER LES EXEMPLES:")
    print("   python exemples.py")
    
    print("\n2️⃣  INSTALLER OLLAMA (pour questions longues):")
    print("   Windows: Télécharger depuis https://ollama.ai")
    print("   Linux/Mac: curl -fsSL https://ollama.ai/install.sh | sh")
    print("   Puis: ollama pull mistral")
    
    print("\n3️⃣  DÉMARRER L'API:")
    print("   python -m ia_correction.api")
    print("   Documentation: http://localhost:8000/docs")
    
    print("\n4️⃣  TESTER L'API:")
    print("   curl http://localhost:8000/health")
    
    print("\n5️⃣  INTÉGRER DANS VOTRE PLATEFORME:")
    print("   - Utiliser l'API REST (recommandé)")
    print("   - Ou importer directement le module Python")
    
    print("\n📚 DOCUMENTATION:")
    print("   Voir README.md pour plus de détails")


def main():
    """Fonction principale"""
    print("\n" + "="*60)
    print("🎓 SYSTÈME DE CORRECTION AUTOMATIQUE IA")
    print("   Guide de Démarrage Rapide")
    print("="*60)
    
    # Vérifier les dépendances
    deps_ok = check_dependencies()
    
    if not deps_ok:
        print("\n⚠️  Veuillez installer les dépendances manquantes avant de continuer.")
        sys.exit(1)
    
    # Tests
    tests_results = []
    
    tests_results.append(("QCM", test_basic_correction()))
    tests_results.append(("Calcul", test_calcul_correction()))
    tests_results.append(("API", test_api_availability()))
    
    # Résumé
    print("\n" + "="*60)
    print("📊 RÉSUMÉ DES TESTS")
    print("="*60)
    
    for test_name, result in tests_results:
        status = "✓ RÉUSSI" if result else "✗ ÉCHOUÉ"
        print(f"  {test_name}: {status}")
    
    all_passed = all(result for _, result in tests_results)
    
    if all_passed:
        print("\n✅ Tous les tests sont passés avec succès!")
        print("🚀 Le système est prêt à être utilisé!")
    else:
        print("\n⚠️  Certains tests ont échoué.")
        print("💡 Vérifiez les erreurs ci-dessus et assurez-vous que toutes les dépendances sont installées.")
    
    show_next_steps()
    
    print("\n" + "="*60)


if __name__ == "__main__":
    main()
