<template>
  <div class="passer-examen">
    <div v-if="!evaluation" class="alert alert-error">
      Examen introuvable
    </div>

    <div v-else-if="!termine">
      <!-- En-tête examen -->
      <div class="card exam-header">
        <div class="flex-between">
          <div>
            <h1>{{ evaluation.titre }}</h1>
            <p class="text-muted">{{ evaluation.matiere }} | {{ evaluation.questions.length }} questions</p>
          </div>
          <div class="timer">
            <div class="timer-icon">⏱️</div>
            <div class="timer-value">{{ tempsRestant }}</div>
          </div>
        </div>

        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${(questionActuelle / evaluation.questions.length) * 100}%` }"
          ></div>
        </div>
        <p class="text-center text-muted">
          Question {{ questionActuelle + 1 }} / {{ evaluation.questions.length }}
        </p>
      </div>

      <!-- Question actuelle -->
      <div class="card question-container">
        <div class="question-header">
          <span class="badge" :class="`badge-${getTypeBadgeColor(question.type)}`">
            {{ question.type.toUpperCase() }}
          </span>
          <span class="points">{{ question.points_max }} points</span>
        </div>

        <h2 class="question-enonce">{{ question.enonce }}</h2>

        <!-- QCM -->
        <div v-if="question.type === 'qcm'" class="reponse-zone">
          <div 
            v-for="(option, index) in question.options" 
            :key="index"
            class="qcm-option"
            :class="{ selected: reponses[question.id] === String.fromCharCode(65 + index) }"
            @click="repondreQcm(question.id, String.fromCharCode(65 + index))"
          >
            <div class="option-letter">{{ String.fromCharCode(65 + index) }}</div>
            <div class="option-text">{{ option }}</div>
          </div>
        </div>

        <!-- Calcul ou Courte -->
        <div v-else-if="question.type === 'calcul' || question.type === 'courte'" class="reponse-zone">
          <input 
            v-model="reponses[question.id]"
            type="text"
            class="reponse-input"
            :placeholder="question.type === 'calcul' ? 'Votre réponse (nombre)' : 'Votre réponse'"
          />
        </div>

        <!-- Longue -->
        <div v-else-if="question.type === 'longue'" class="reponse-zone">
          <textarea 
            v-model="reponses[question.id]"
            rows="10"
            class="reponse-textarea"
            placeholder="Développez votre réponse ici..."
          ></textarea>
          <p class="text-muted" style="margin-top: 0.5rem;">
            {{ (reponses[question.id] || '').length }} caractères
          </p>
        </div>
      </div>

      <!-- Navigation -->
      <div class="card navigation-buttons">
        <div class="flex-between">
          <button 
            @click="questionPrecedente" 
            class="btn btn-outline"
            :disabled="questionActuelle === 0"
          >
            ← Précédent
          </button>
          
          <button 
            v-if="questionActuelle < evaluation.questions.length - 1"
            @click="questionSuivante" 
            class="btn btn-primary"
          >
            Suivant →
          </button>
          
          <button 
            v-else
            @click="confirmerSoumission" 
            class="btn btn-success"
          >
            ✓ Terminer et soumettre
          </button>
        </div>
      </div>

      <!-- Mini carte de navigation -->
      <div class="card questions-nav">
        <h4>Navigation rapide:</h4>
        <div class="questions-grid">
          <button
            v-for="(q, index) in evaluation.questions"
            :key="index"
            class="question-nav-btn"
            :class="{
              active: index === questionActuelle,
              answered: reponses[q.id] && reponses[q.id].trim() !== ''
            }"
            @click="questionActuelle = index"
          >
            {{ index + 1 }}
          </button>
        </div>
      </div>
    </div>

    <!-- Écran de chargement correction -->
    <div v-else-if="correcting" class="card text-center" style="padding: 4rem;">
      <div class="loading" style="width: 60px; height: 60px; border-width: 6px; margin: 0 auto 2rem;"></div>
      <h2>Correction en cours...</h2>
      <p class="text-muted">L'IA analyse vos réponses, veuillez patienter.</p>
    </div>

    <!-- Résultats -->
    <div v-else-if="resultat">
      <div class="card text-center result-header">
        <h1 style="font-size: 3rem; margin-bottom: 1rem;">
          {{ resultat.note_totale.toFixed(1) }}/{{ resultat.note_max }}
        </h1>
        <div class="note-percentage" :class="getPercentageClass(resultat.pourcentage_global)">
          {{ resultat.pourcentage_global.toFixed(1) }}%
        </div>
        <p style="font-size: 1.25rem; margin-top: 1rem;">
          {{ resultat.appreciation }}
        </p>
      </div>

      <!-- Détail par question -->
      <div class="card">
        <h3>📋 Détail par question</h3>
        
        <div 
          v-for="(res, index) in resultat.resultats" 
          :key="index"
          class="result-question"
        >
          <div class="flex-between">
            <div class="flex" style="align-items: center; gap: 1rem;">
              <span class="question-number">Q{{ index + 1 }}</span>
              <span :class="res.est_correct ? 'text-success' : 'text-error'">
                {{ res.est_correct ? '✓' : '✗' }}
              </span>
            </div>
            <div class="result-points">
              {{ res.points_obtenus.toFixed(1) }} / {{ res.points_max }} pts
              <span class="badge" :class="res.est_correct ? 'badge-success' : 'badge-error'">
                {{ res.pourcentage.toFixed(0) }}%
              </span>
            </div>
          </div>
          
          <div class="feedback-box">
            {{ res.feedback }}
          </div>
        </div>
      </div>

      <div class="flex" style="gap: 1rem; margin-top: 2rem;">
        <router-link to="/etudiant/examens" class="btn btn-outline" style="flex: 1; text-decoration: none;">
          ← Retour aux examens
        </router-link>
        <router-link to="/resultats" class="btn btn-primary" style="flex: 1; text-decoration: none;">
          📊 Voir tous mes résultats
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEvaluationStore } from '../stores/evaluationStore'
import { correctionApi } from '../services/correctionApi'

const route = useRoute()
const router = useRouter()
const store = useEvaluationStore()

const evaluation = ref(null)
const questionActuelle = ref(0)
const reponses = ref({})
const termine = ref(false)
const correcting = ref(false)
const resultat = ref(null)
const tempsEcoule = ref(0)
const timerInterval = ref(null)

const question = computed(() => {
  if (!evaluation.value) return null
  return evaluation.value.questions[questionActuelle.value]
})

const tempsRestant = computed(() => {
  if (!evaluation.value) return '00:00'
  const totalSecondes = evaluation.value.duree_minutes * 60
  const restant = Math.max(0, totalSecondes - tempsEcoule.value)
  const minutes = Math.floor(restant / 60)
  const secondes = restant % 60
  return `${minutes.toString().padStart(2, '0')}:${secondes.toString().padStart(2, '0')}`
})

onMounted(() => {
  evaluation.value = store.getEvaluation(route.params.id)
  
  if (!evaluation.value) {
    router.push('/etudiant/examens')
    return
  }

  // Initialiser les réponses
  evaluation.value.questions.forEach(q => {
    reponses.value[q.id] = ''
  })

  // Démarrer le timer
  timerInterval.value = setInterval(() => {
    tempsEcoule.value++
    
    // Auto-soumission si temps écoulé
    if (tempsEcoule.value >= evaluation.value.duree_minutes * 60) {
      soumettreExamen()
    }
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

function getTypeBadgeColor(type) {
  const colors = {
    qcm: 'info',
    calcul: 'warning',
    courte: 'success',
    longue: 'error'
  }
  return colors[type] || 'info'
}

function repondreQcm(questionId, lettre) {
  reponses.value[questionId] = lettre
}

function questionPrecedente() {
  if (questionActuelle.value > 0) {
    questionActuelle.value--
  }
}

function questionSuivante() {
  if (questionActuelle.value < evaluation.value.questions.length - 1) {
    questionActuelle.value++
  }
}

function confirmerSoumission() {
  const nbReponses = Object.values(reponses.value).filter(r => r && r.trim() !== '').length
  const total = evaluation.value.questions.length
  
  if (nbReponses < total) {
    if (!confirm(`Vous n'avez répondu qu'à ${nbReponses}/${total} questions. Soumettre quand même ?`)) {
      return
    }
  }
  
  soumettreExamen()
}

async function soumettreExamen() {
  termine.value = true
  correcting.value = true

  try {
    // Préparer la copie
    const copie = {
      evaluation_id: evaluation.value.id,
      eleve_id: 'demo_user',
      eleve_nom: 'Utilisateur Démo',
      date_soumission: new Date().toISOString(),
      reponses: evaluation.value.questions.map(q => ({
        question_id: q.id,
        reponse: reponses.value[q.id] || '',
        temps_reponse: Math.floor(tempsEcoule.value / evaluation.value.questions.length)
      }))
    }

    // Appeler l'API de correction
    const res = await correctionApi.corrigerCopie(evaluation.value, copie)
    
    // Sauvegarder le résultat
    store.ajouterResultat(res)
    resultat.value = res

  } catch (error) {
    alert('Erreur lors de la correction: ' + error.message)
    console.error(error)
    termine.value = false
  } finally {
    correcting.value = false
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
    }
  }
}

function getPercentageClass(percentage) {
  if (percentage >= 75) return 'excellent'
  if (percentage >= 50) return 'good'
  return 'insufficient'
}
</script>

<style scoped>
.exam-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin-bottom: 2rem;
}

.exam-header h1 {
  color: white;
  margin-bottom: 0.5rem;
}

.timer {
  text-align: center;
}

.timer-icon {
  font-size: 2rem;
}

.timer-value {
  font-size: 2rem;
  font-weight: 700;
  font-family: monospace;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  margin: 1.5rem 0 0.5rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: white;
  transition: width 0.3s;
}

.question-container {
  margin-bottom: 2rem;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.points {
  font-weight: 600;
  color: var(--gray-600);
}

.question-enonce {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.reponse-zone {
  margin-top: 2rem;
}

.qcm-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 2px solid var(--gray-300);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.qcm-option:hover {
  background: var(--gray-50);
  border-color: var(--primary);
}

.qcm-option.selected {
  background: #eff6ff;
  border-color: var(--primary);
  border-width: 3px;
}

.option-letter {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--gray-200);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
}

.qcm-option.selected .option-letter {
  background: var(--primary);
  color: white;
}

.option-text {
  flex: 1;
  font-size: 1.125rem;
}

.reponse-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--gray-300);
  border-radius: 0.75rem;
  font-size: 1.125rem;
}

.reponse-input:focus {
  outline: none;
  border-color: var(--primary);
}

.reponse-textarea {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--gray-300);
  border-radius: 0.75rem;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
}

.reponse-textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.questions-nav h4 {
  margin-bottom: 1rem;
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 0.5rem;
}

.question-nav-btn {
  padding: 0.75rem;
  border: 2px solid var(--gray-300);
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.question-nav-btn:hover {
  background: var(--gray-50);
}

.question-nav-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.question-nav-btn.answered {
  background: #d1fae5;
  border-color: var(--success);
}

.result-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem;
}

.result-header h1 {
  color: white;
}

.note-percentage {
  display: inline-block;
  padding: 0.5rem 2rem;
  border-radius: 999px;
  font-size: 2rem;
  font-weight: 700;
  margin: 1rem 0;
}

.note-percentage.excellent {
  background: var(--success);
  color: white;
}

.note-percentage.good {
  background: var(--warning);
  color: white;
}

.note-percentage.insufficient {
  background: var(--error);
  color: white;
}

.result-question {
  padding: 1.5rem;
  border: 2px solid var(--gray-200);
  border-radius: 0.75rem;
  margin-bottom: 1rem;
}

.question-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--gray-200);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.result-points {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-weight: 600;
}

.feedback-box {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--gray-50);
  border-radius: 0.5rem;
  border-left: 4px solid var(--primary);
}
</style>
