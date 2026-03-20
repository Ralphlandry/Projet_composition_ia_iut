<template>
  <div class="home">
    <div class="hero card" style="text-align: center; padding: 3rem;">
      <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">
        🎓 Bienvenue sur le Système de Correction IA
      </h1>
      <p style="font-size: 1.25rem; color: var(--gray-600); margin-bottom: 2rem;">
        Testez l'API de correction automatique pour QCM, calculs, questions courtes et longues
      </p>

      <div class="api-info alert alert-info" style="max-width: 600px; margin: 0 auto 2rem;">
        <h3>État de l'API</h3>
        <div v-if="health.loading">Vérification...</div>
        <div v-else-if="health.data">
          <p><strong>Statut:</strong> {{ health.data.status }}</p>
          <div class="modules-status" style="margin-top: 1rem;">
            <h4>Modules disponibles:</h4>
            <ul style="list-style: none; padding: 0;">
              <li>
                <span :class="health.data.modules.qcm ? 'text-success' : 'text-error'">
                  {{ health.data.modules.qcm ? '✓' : '✗' }} QCM
                </span>
              </li>
              <li>
                <span :class="health.data.modules.calcul ? 'text-success' : 'text-error'">
                  {{ health.data.modules.calcul ? '✓' : '✗' }} Calculs
                </span>
              </li>
              <li>
                <span :class="health.data.modules.courte ? 'text-success' : 'text-error'">
                  {{ health.data.modules.courte ? '✓' : '✗' }} Questions courtes (IA)
                </span>
              </li>
              <li>
                <span :class="health.data.modules.longue ? 'text-success' : 'text-error'">
                  {{ health.data.modules.longue ? '✓' : '✗' }} Questions longues (LLM)
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="alert-error">
          ⚠️ API non accessible. Assurez-vous qu'elle tourne sur http://localhost:8000
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">👨‍🏫 Espace Enseignant</div>
        <p class="text-muted mb-4">Créez et gérez vos épreuves</p>
        
        <div class="flex" style="flex-direction: column; gap: 1rem;">
          <router-link to="/enseignant/creer" class="btn btn-primary" style="text-decoration: none;">
            ➕ Créer une épreuve manuellement
          </router-link>
          
          <router-link to="/enseignant/import-pdf" class="btn btn-outline" style="text-decoration: none;">
            📄 Importer depuis un PDF
          </router-link>
        </div>

        <div class="mt-4" v-if="store.evaluations.length > 0">
          <h4>Épreuves créées ({{ store.evaluations.length }})</h4>
          <ul style="list-style: none; padding: 0;">
            <li v-for="evaluation in store.evaluations" :key="evaluation.id" style="padding: 0.5rem 0; border-bottom: 1px solid var(--gray-200);">
              {{ evaluation.titre }} ({{ evaluation.questions.length }} questions)
            </li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-header">✏️ Espace Étudiant</div>
        <p class="text-muted mb-4">Passez les examens disponibles</p>
        
        <router-link to="/etudiant/examens" class="btn btn-success" style="text-decoration: none;">
          📝 Voir les examens disponibles
        </router-link>

        <div class="mt-4" v-if="store.resultats.length > 0">
          <h4>Mes résultats ({{ store.resultats.length }})</h4>
          <router-link to="/resultats" class="btn btn-outline" style="text-decoration: none;">
            📊 Consulter mes résultats
          </router-link>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header">📚 Guide d'utilisation</div>
      <div class="grid grid-2">
        <div>
          <h4>Pour l'enseignant:</h4>
          <ol>
            <li>Créez une épreuve (manuellement ou via PDF)</li>
            <li>Ajoutez différents types de questions (QCM, calculs, courtes, longues)</li>
            <li>L'épreuve est automatiquement disponible pour les étudiants</li>
          </ol>
        </div>
        <div>
          <h4>Pour l'étudiant:</h4>
          <ol>
            <li>Consultez les examens disponibles</li>
            <li>Répondez aux questions</li>
            <li>Soumettez et obtenez votre correction automatique</li>
            <li>Consultez vos résultats détaillés</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { correctionApi } from '../services/correctionApi'
import { useEvaluationStore } from '../stores/evaluationStore'

const store = useEvaluationStore()
const health = ref({
  loading: true,
  data: null
})

onMounted(async () => {
  try {
    const data = await correctionApi.healthCheck()
    health.value = {
      loading: false,
      data
    }
  } catch (error) {
    health.value = {
      loading: false,
      data: null
    }
  }
})
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.hero h1 {
  color: white;
}

.hero p {
  color: rgba(255, 255, 255, 0.9);
}

.modules-status ul {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  text-align: left;
}
</style>
