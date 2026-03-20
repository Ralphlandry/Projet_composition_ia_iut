<template>
  <div class="resultats">
    <div class="card">
      <div class="card-header">📊 Mes Résultats</div>
      
      <div v-if="store.resultats.length === 0" class="alert alert-info">
        Vous n'avez pas encore passé d'examen.
        <router-link to="/etudiant/examens">Passer un examen</router-link>
      </div>

      <div v-else>
        <!-- Statistiques globales -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-value">{{ store.resultats.length }}</div>
            <div class="stat-label">Examens passés</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-value">{{ moyenneGlobale.toFixed(1) }}%</div>
            <div class="stat-label">Moyenne générale</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⭐</div>
            <div class="stat-value">{{ meilleureNote.toFixed(1) }}/{{ maxPoints }}</div>
            <div class="stat-label">Meilleure note</div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">✓</div>
            <div class="stat-value">{{ tauxReussite.toFixed(0) }}%</div>
            <div class="stat-label">Taux de réussite</div>
          </div>
        </div>

        <!-- Graphique d'évolution -->
        <div class="card" style="margin-top: 2rem; background: var(--gray-50);">
          <h3>📊 Évolution des résultats</h3>
          <div class="chart-container">
            <svg viewBox="0 0 800 300" class="chart">
              <!-- Lignes de grille -->
              <line x1="50" y1="250" x2="750" y2="250" stroke="#e5e7eb" stroke-width="2"/>
              <line x1="50" y1="200" x2="750" y2="200" stroke="#e5e7eb" stroke-width="1"/>
              <line x1="50" y1="150" x2="750" y2="150" stroke="#e5e7eb" stroke-width="1"/>
              <line x1="50" y1="100" x2="750" y2="100" stroke="#e5e7eb" stroke-width="1"/>
              <line x1="50" y1="50" x2="750" y2="50" stroke="#e5e7eb" stroke-width="1"/>
              
              <!-- Lignes de données -->
              <polyline
                :points="chartPoints"
                fill="none"
                stroke="#3b82f6"
                stroke-width="3"
              />
              
              <!-- Points -->
              <circle
                v-for="(point, index) in chartData"
                :key="index"
                :cx="point.x"
                :cy="point.y"
                r="6"
                fill="#3b82f6"
              />
              
              <!-- Labels -->
              <text x="25" y="255" font-size="12" fill="#6b7280">0%</text>
              <text x="15" y="205" font-size="12" fill="#6b7280">25%</text>
              <text x="15" y="155" font-size="12" fill="#6b7280">50%</text>
              <text x="15" y="105" font-size="12" fill="#6b7280">75%</text>
              <text x="10" y="55" font-size="12" fill="#6b7280">100%</text>
            </svg>
          </div>
        </div>

        <!-- Liste détaillée -->
        <div class="card" style="margin-top: 2rem;">
          <h3>📋 Détail des examens</h3>
          
          <div 
            v-for="(resultat, index) in resultatsOrdonnes" 
            :key="index"
            class="resultat-item"
          >
            <div class="resultat-header">
              <div>
                <h4>{{ getEvaluationTitre(resultat.copie.evaluation_id) }}</h4>
                <p class="text-muted">
                  {{ new Date(resultat.date).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) }}
                </p>
              </div>
              
              <div class="resultat-note">
                <div class="note-value">
                  {{ resultat.note_totale.toFixed(1) }}/{{ resultat.note_max }}
                </div>
                <div 
                  class="note-badge"
                  :class="getNoteBadgeClass(resultat.pourcentage_global)"
                >
                  {{ resultat.pourcentage_global.toFixed(1) }}%
                </div>
              </div>
            </div>

            <div class="appreciation-box">
              {{ resultat.appreciation }}
            </div>

            <!-- Détails des questions -->
            <details class="details-questions">
              <summary>Voir le détail des {{ resultat.resultats.length }} questions</summary>
              
              <div class="questions-detail">
                <div 
                  v-for="(res, qIndex) in resultat.resultats"
                  :key="qIndex"
                  class="question-detail"
                >
                  <div class="flex-between">
                    <span class="question-num">Question {{ qIndex + 1 }}</span>
                    <span class="question-points">
                      {{ res.points_obtenus.toFixed(1) }}/{{ res.points_max }}
                      <span :class="res.est_correct ? 'text-success' : 'text-error'">
                        {{ res.est_correct ? '✓' : '✗' }}
                      </span>
                    </span>
                  </div>
                  <div class="question-feedback">
                    {{ res.feedback }}
                  </div>
                </div>
              </div>
            </details>

            <!-- Actions -->
            <div class="resultat-actions">
              <button 
                @click="telechargerPdf(resultat)" 
                class="btn btn-outline"
                style="font-size: 0.875rem; padding: 0.5rem 1rem;"
              >
                📥 Télécharger PDF
              </button>
              <button 
                @click="partagerResultat(resultat)" 
                class="btn btn-outline"
                style="font-size: 0.875rem; padding: 0.5rem 1rem;"
              >
                🔗 Partager
              </button>
            </div>
          </div>
        </div>

        <!-- Analyse par type de question -->
        <div class="card" style="margin-top: 2rem;">
          <h3>🎯 Performance par type de question</h3>
          
          <div class="performance-grid">
            <div 
              v-for="(perf, type) in performanceParType"
              :key="type"
              class="performance-item"
            >
              <div class="perf-header">
                <span class="badge" :class="`badge-${getTypeBadgeColor(type)}`">
                  {{ type.toUpperCase() }}
                </span>
                <span class="text-muted">{{ perf.total }} questions</span>
              </div>
              
              <div class="perf-bar">
                <div 
                  class="perf-fill" 
                  :style="{ width: `${perf.pourcentage}%` }"
                  :class="getPerformanceClass(perf.pourcentage)"
                ></div>
              </div>
              
              <div class="perf-stats">
                <span>{{ perf.pourcentage.toFixed(0) }}% de réussite</span>
                <span class="text-muted">{{ perf.correct }}/{{ perf.total }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEvaluationStore } from '../stores/evaluationStore'

const store = useEvaluationStore()

const resultatsOrdonnes = computed(() => {
  return [...store.resultats].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  )
})

const moyenneGlobale = computed(() => {
  if (store.resultats.length === 0) return 0
  const sum = store.resultats.reduce((acc, r) => acc + r.pourcentage_global, 0)
  return sum / store.resultats.length
})

const meilleureNote = computed(() => {
  if (store.resultats.length === 0) return 0
  return Math.max(...store.resultats.map(r => r.note_totale))
})

const maxPoints = computed(() => {
  if (store.resultats.length === 0) return 20
  return store.resultats[0]?.note_max || 20
})

const tauxReussite = computed(() => {
  if (store.resultats.length === 0) return 0
  const reussis = store.resultats.filter(r => r.pourcentage_global >= 50).length
  return (reussis / store.resultats.length) * 100
})

const chartData = computed(() => {
  const width = 700
  const height = 200
  const padding = 50
  
  return resultatsOrdonnes.value.slice(0, 10).reverse().map((r, i) => {
    const x = padding + (i * (width / Math.max(1, resultatsOrdonnes.value.length - 1)))
    const y = 250 - (r.pourcentage_global / 100) * height
    return { x, y }
  })
})

const chartPoints = computed(() => {
  return chartData.value.map(p => `${p.x},${p.y}`).join(' ')
})

const performanceParType = computed(() => {
  const types = {}
  
  store.resultats.forEach(resultat => {
    resultat.resultats.forEach((res, index) => {
      const question = getQuestion(resultat.copie.evaluation_id, index)
      if (!question) return
      
      if (!types[question.type]) {
        types[question.type] = { total: 0, correct: 0, pourcentage: 0 }
      }
      
      types[question.type].total++
      if (res.est_correct) {
        types[question.type].correct++
      }
    })
  })
  
  // Calculer pourcentages
  Object.keys(types).forEach(type => {
    types[type].pourcentage = (types[type].correct / types[type].total) * 100
  })
  
  return types
})

function getEvaluationTitre(evalId) {
  const evaluation = store.getEvaluation(evalId)
  return evaluation?.titre || 'Examen'
}

function getQuestion(evalId, index) {
  const evaluation = store.getEvaluation(evalId)
  return evaluation?.questions[index]
}

function getNoteBadgeClass(pourcentage) {
  if (pourcentage >= 75) return 'excellent'
  if (pourcentage >= 50) return 'good'
  return 'insufficient'
}

function getTypeBadgeColor(type) {
  const colors = {
    qcm: 'info',
    calcul: 'warning',
    courte: 'success',
    longue: 'error'
  }
  return colors[type] || 'info'
}

function getPerformanceClass(pourcentage) {
  if (pourcentage >= 75) return 'perf-excellent'
  if (pourcentage >= 50) return 'perf-good'
  return 'perf-insufficient'
}

function telechargerPdf(resultat) {
  alert('Fonctionnalité de téléchargement PDF à venir')
}

function partagerResultat(resultat) {
  const text = `J'ai obtenu ${resultat.note_totale}/${resultat.note_max} (${resultat.pourcentage_global.toFixed(1)}%) à l'examen !`
  if (navigator.share) {
    navigator.share({ text })
  } else {
    navigator.clipboard.writeText(text)
    alert('Résultat copié dans le presse-papiers !')
  }
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
}

.stat-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.chart-container {
  background: white;
  border-radius: 0.75rem;
  padding: 1rem;
  margin-top: 1rem;
}

.chart {
  width: 100%;
  height: auto;
}

.resultat-item {
  border: 2px solid var(--gray-200);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: all 0.2s;
}

.resultat-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.resultat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.resultat-header h4 {
  margin-bottom: 0.25rem;
}

.resultat-note {
  text-align: right;
}

.note-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--gray-900);
}

.note-badge {
  display: inline-block;
  padding: 0.25rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  margin-top: 0.5rem;
}

.note-badge.excellent {
  background: var(--success);
  color: white;
}

.note-badge.good {
  background: var(--warning);
  color: white;
}

.note-badge.insufficient {
  background: var(--error);
  color: white;
}

.appreciation-box {
  padding: 1rem;
  background: var(--gray-50);
  border-radius: 0.5rem;
  border-left: 4px solid var(--primary);
  margin-bottom: 1rem;
}

.details-questions {
  margin: 1rem 0;
}

.details-questions summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--primary);
  padding: 0.5rem;
}

.questions-detail {
  margin-top: 1rem;
  padding-left: 1rem;
}

.question-detail {
  padding: 0.75rem;
  background: var(--gray-50);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.question-num {
  font-weight: 600;
}

.question-points {
  font-weight: 600;
}

.question-feedback {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--gray-600);
}

.resultat-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--gray-200);
}

.performance-grid {
  display: grid;
  gap: 1rem;
}

.performance-item {
  padding: 1rem;
  background: var(--gray-50);
  border-radius: 0.75rem;
}

.perf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.perf-bar {
  height: 12px;
  background: var(--gray-200);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.perf-fill {
  height: 100%;
  transition: width 0.3s;
}

.perf-fill.perf-excellent {
  background: var(--success);
}

.perf-fill.perf-good {
  background: var(--warning);
}

.perf-fill.perf-insufficient {
  background: var(--error);
}

.perf-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}
</style>
