# Commandes de lancement et d'arrêt — EvalPro

Ce fichier regroupe toutes les commandes utiles pour **démarrer**, **tester** et **arrêter** le projet EvalPro, en **local classique** et avec **Docker**.

---

## 1) Lancement local classique

### A. Lancer PostgreSQL
Assure-toi que PostgreSQL est démarré sur ton PC.

Port par défaut : `5432`

---

### B. Lancer le service IA
Dans un terminal PowerShell :

```powershell
cd "D:\projet api sgstock\projet_iut\ia"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
ollama pull qwen2.5:3b
uvicorn ia_correction.api:app --reload --port 8000
```

Vérifier que l'IA répond :

```powershell
Invoke-RestMethod http://localhost:8000/health
```

---

### C. Lancer le backend FastAPI
Dans un nouveau terminal :

```powershell
cd "D:\projet api sgstock\projet_iut\exam-backend-fastapi"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8001
```

Initialiser les données de base :

```powershell
Invoke-RestMethod -Method Post http://localhost:8001/api/setup/init
```

Créer le premier compte admin :

```powershell
python scripts/create_admin.py --email admin@ecole.com --password Admin123! --full-name "Super Admin"
```

Vérifier le backend :

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8001/docs
```

---

### D. Lancer le frontend React/Vite
Dans un autre terminal :

```powershell
cd "D:\projet api sgstock\projet_iut\exam-creator-frontend"
npm install
Copy-Item .env.example .env
npm run dev
```

Ouvrir ensuite :

- `http://localhost:8080` ou
- `http://localhost:5173`

(selon la configuration Vite)

---

## 2) Arrêt du projet en local

Pour arrêter un service lancé dans un terminal local :

```powershell
Ctrl + C
```

À faire dans chaque terminal ouvert (frontend, backend, IA).

---

## 3) Lancement avec Docker

Le projet dispose d'un fichier `docker-compose.yml` à la racine.

### A. Démarrer seulement la partie principale (sans IA)

```powershell
cd "D:\projet api sgstock\projet_iut"
docker compose up -d --build postgres backend frontend
```

### B. Démarrer tout le projet avec IA (Ollama + Qwen + service IA)

```powershell
cd "D:\projet api sgstock\projet_iut"
docker compose --profile ai up -d --build
```

---

## 4) Vérifier les conteneurs Docker

Voir les conteneurs actifs :

```powershell
docker ps
```

Voir tous les conteneurs (même arrêtés) :

```powershell
docker ps -a
```

Voir uniquement ceux du projet :

```powershell
docker compose ps
```

---

## 5) Vérifier que les services répondent

### Frontend

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080
```

### Backend

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8001/docs
```

### IA

```powershell
Invoke-RestMethod http://localhost:8000/health
```

### Ollama

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:11434
```

---

## 6) Arrêter Docker

Arrêter tous les services du projet :

```powershell
docker compose down
```

Arrêter et supprimer aussi les volumes (attention : données locales PostgreSQL/Ollama) :

```powershell
docker compose down -v
```

---

## 7) Relancer après arrêt

### Sans IA

```powershell
docker compose up -d postgres backend frontend
```

### Avec IA

```powershell
docker compose --profile ai up -d
```

---

## 8) Voir les logs Docker

### Logs de tous les services

```powershell
docker compose logs
```

### Logs du backend

```powershell
docker compose logs backend --tail 100
```

### Logs du frontend

```powershell
docker compose logs frontend --tail 100
```

### Logs de l'IA

```powershell
docker compose logs ia --tail 100
```

### Logs d'Ollama

```powershell
docker compose logs ollama --tail 100
```

---

## 9) Commandes utiles supplémentaires

Reconstruire un service après modification :

```powershell
docker compose up -d --build backend
```

Redémarrer un service :

```powershell
docker compose restart backend
```

Supprimer les images inutilisées :

```powershell
docker image prune -a
```

---

## 10) URLs finales du projet

- Frontend : `http://localhost:8080`
- Backend API : `http://localhost:8001`
- Swagger backend : `http://localhost:8001/docs`
- Service IA : `http://localhost:8000/health`
- SonarQube : `http://localhost:9000`

---

## 11) Recommandation pratique

Pour un usage normal :

- lance **sans IA** si tu n'as pas besoin de correction intelligente
- lance **avec le profil `ai`** seulement quand tu veux utiliser Ollama/Qwen

Cela évite à l'IA de consommer les ressources de la machine en permanence.
