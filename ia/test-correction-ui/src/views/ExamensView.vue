<template>
  <div class="examens">
    <div class="card">
      <div class="card-header">✏️ Examens Disponibles</div>
      
      <div v-if="store.evaluations.length === 0" class="alert alert-info">
        Aucun examen disponible pour le moment. 
        <router-link to="/enseignant/creer">Créez-en un en tant qu'enseignant</router-link>
      </div>

      <div v-else class="examens-list">
        <div 
          v-for="evaluation in store.evaluations" 
          :key="evaluation.id"
          class="card examen-card"
          style="background: var(--gray-50); border: 2px solid var(--gray-300);"
        >
          <div class="flex-between">
            <div>
              <h3>{{ evaluation.titre }}</h3>
              <p class="text-muted">{{ evaluation.matiere }}</p>
            </div>
            <span class="badge badge-info">{{ evaluation.questions.length }} questions</span>
          </div>

          <div class="examen-info">
            <div class="info-item">
              <span class="label">⏱️ Durée:</span>
              <span>{{ evaluation.duree_minutes }} min</span>
            </div>
            <div class="info-item">
              <span class="label">📊 Barème:</span>
              <span>{{ evaluation.bareme_total }} points</span>
            </div>
            <div class="info-item">
              <span class="label">📅 Créé le:</span>
              <span>{{ new Date(evaluation.date_creation).toLocaleDateString('fr-FR') }}</span>
            </div>
          </div>

          <div class="questions-preview">
            <h4>Aperçu des questions:</h4>
            <ul>
              <li v-for="(q, i) in evaluation.questions.slice(0, 3)" :key="i">
                <span class="badge" :class="`badge-${getTypeBadgeColor(q.type)}`">
                  {{ q.type.toUpperCase() }}
                </span>
                {{ q.enonce.substring(0, 60) }}{{ q.enonce.length > 60 ? '...' : '' }}
                <span class="text-muted">({{ q.points_max }}pts)</span>
              </li>
              <li v-if="evaluation.questions.length > 3" class="text-muted">
                + {{ evaluation.questions.length - 3 }} autre(s) question(s)
              </li>
            </ul>
          </div>

          <router-link 
            :to="`/etudiant/passer/${evaluation.id}`"
            class="btn btn-primary"
            style="text-decoration: none; width: 100%; margin-top: 1rem;"
          >
            📝 Commencer l'examen
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useEvaluationStore } from '../stores/evaluationStore'

const store = useEvaluationStore()

function getTypeBadgeColor(type) {
  const colors = {
    qcm: 'info',
    calcul: 'warning',
    courte: 'success',
    longue: 'error'
  }
  return colors[type] || 'info'
}
</script>

<style scoped>
.examens-list {
  display: grid;
  gap: 1.5rem;
}

.examen-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.examen-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.examen-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--gray-600);
}

.questions-preview {
  margin-top: 1.5rem;
}

.questions-preview h4 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: var(--gray-700);
}

.questions-preview ul {
  list-style: none;
  padding: 0;
}

.questions-preview li {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
