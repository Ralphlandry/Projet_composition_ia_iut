# Interface de Test - Système de Correction IA

Interface Vue.js complète pour tester l'API de correction automatique.

## 🚀 Installation

```bash
cd test-correction-ui
npm install
```

## ▶️ Lancement

### 1. Démarrer l'API (dans un terminal)
```bash
# Dans le dossier projet_iut
python -m ia_correction.api
```

### 2. Démarrer l'interface Vue (dans un autre terminal)
```bash
# Dans le dossier test-correction-ui
npm run dev
```

L'interface sera disponible sur : **http://localhost:5173**

## 📋 Fonctionnalités

### 👨‍🏫 Espace Enseignant

1. **Créer une épreuve manuellement**
   - Formulaire complet pour chaque type de question
   - Support QCM, calculs, questions courtes et longues
   - Validation en temps réel

2. **Importer depuis un PDF**
   - Upload de fichier PDF
   - Extraction automatique du texte
   - Transformation en questions (avec IA basique)
   - Modification avant création

### ✏️ Espace Étudiant

1. **Passer un examen**
   - Timer en temps réel
   - Navigation entre questions
   - Sauvegarde automatique
   - Correction instantanée après soumission

2. **Consulter les résultats**
   - Statistiques globales
   - Graphique d'évolution
   - Détail par question
   - Performance par type de question

## 🏗️ Structure

```
test-correction-ui/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── style.css
│   ├── router/
│   │   └── index.js
│   ├── views/
│   │   ├── HomeView.vue           # Page d'accueil
│   │   ├── CreerEpreuveView.vue   # Création manuelle
│   │   ├── ImportPdfView.vue      # Import PDF
│   │   ├── ExamensView.vue        # Liste examens
│   │   ├── PasserExamenView.vue   # Passage examen
│   │   └── ResultatsView.vue      # Résultats
│   ├── services/
│   │   └── correctionApi.js       # Service API
│   └── stores/
│       └── evaluationStore.js     # Store Pinia
```

## 🎯 Workflow Complet

1. **Enseignant crée une épreuve** (manuellement ou via PDF)
2. **Épreuve apparaît dans "Examens disponibles"**
3. **Étudiant passe l'examen**
4. **Soumission → Appel API de correction**
5. **Résultats affichés instantanément**
6. **Consultation détaillée dans "Mes résultats"**

## 🔧 Configuration

L'API est configurée pour pointer sur `http://localhost:8000` (voir `src/services/correctionApi.js`)

Si vous changez le port de l'API, modifiez :
```javascript
const API_BASE_URL = 'http://localhost:VOTRE_PORT'
```

## 📦 Dépendances Principales

- **Vue 3** : Framework frontend
- **Vue Router** : Navigation
- **Pinia** : State management
- **Axios** : Requêtes HTTP
- **PDF.js** : Extraction PDF
- **Vite** : Build tool

## 🎨 Personnalisation

Les couleurs et styles sont dans `src/style.css`. Variables CSS :
- `--primary`: Couleur principale
- `--success`: Vert (succès)
- `--warning`: Orange (avertissement)
- `--error`: Rouge (erreur)

## ✅ Checklist de Test

- [ ] API démarrée (http://localhost:8000)
- [ ] Interface lancée (http://localhost:5173)
- [ ] Créer une épreuve
- [ ] Passer un examen
- [ ] Vérifier la correction
- [ ] Consulter les résultats
- [ ] Tester import PDF

Bon test ! 🚀
