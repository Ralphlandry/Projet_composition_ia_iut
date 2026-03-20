<template>
  <div id="app">
    <header class="header">
      <div class="container">
        <div class="flex-between">
          <div class="logo">
            <h1>🎓 Système de Correction IA</h1>
            <p class="text-muted">Interface de test et démonstration</p>
          </div>
          <div class="api-status">
            <span v-if="apiStatus.loading" class="badge badge-info">
              Vérification...
            </span>
            <span v-else-if="apiStatus.healthy" class="badge badge-success">
              ✓ API Connectée
            </span>
            <span v-else class="badge badge-error">
              ✗ API Hors ligne
            </span>
          </div>
        </div>
      </div>
    </header>

    <nav class="nav">
      <div class="container">
        <div class="nav-links">
          <router-link to="/" class="nav-link">🏠 Accueil</router-link>
          <router-link to="/enseignant/creer" class="nav-link">👨‍🏫 Créer Épreuve</router-link>
          <router-link to="/enseignant/import-pdf" class="nav-link">📄 Import PDF</router-link>
          <router-link to="/etudiant/examens" class="nav-link">✏️ Passer Examen</router-link>
          <router-link to="/resultats" class="nav-link">📊 Résultats</router-link>
        </div>
      </div>
    </nav>

    <main class="container">
      <router-view />
    </main>

    <footer class="footer">
      <div class="container text-center">
        <p class="text-muted">
          Système de Correction Automatique IA | API FastAPI + Vue.js
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { correctionApi } from './services/correctionApi'

const apiStatus = ref({
  loading: true,
  healthy: false
})

onMounted(async () => {
  try {
    const health = await correctionApi.healthCheck()
    apiStatus.value = {
      loading: false,
      healthy: health.status === 'healthy'
    }
  } catch (error) {
    apiStatus.value = {
      loading: false,
      healthy: false
    }
  }
})
</script>

<style scoped>
.header {
  background: white;
  border-bottom: 2px solid var(--gray-200);
  padding: 1.5rem 0;
  margin-bottom: 0;
}

.logo h1 {
  font-size: 1.5rem;
  color: var(--primary);
  margin-bottom: 0.25rem;
}

.nav {
  background: var(--gray-900);
  padding: 0;
  margin-bottom: 2rem;
}

.nav-links {
  display: flex;
  gap: 0;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 1rem 1.5rem;
  transition: background 0.2s;
  border-bottom: 3px solid transparent;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nav-link.router-link-active {
  background: rgba(255, 255, 255, 0.1);
  border-bottom-color: var(--primary);
}

.footer {
  margin-top: 4rem;
  padding: 2rem 0;
  border-top: 2px solid var(--gray-200);
}

.api-status {
  display: flex;
  align-items: center;
}
</style>
