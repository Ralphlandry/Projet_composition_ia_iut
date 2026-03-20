<template>
  <div class="creer-epreuve">
    <div class="card">
      <div class="card-header">👨‍🏫 Créer une Nouvelle Épreuve</div>
      
      <form @submit.prevent="creerEpreuve">
        <!-- Informations générales -->
        <div class="input-group">
          <label>Titre de l'épreuve *</label>
          <input 
            v-model="evaluation.titre" 
            type="text" 
            placeholder="Ex: Contrôle Réseau - Semestre 1"
            required
          />
        </div>

        <div class="grid grid-2">
          <div class="input-group">
            <label>Matière *</label>
            <select v-model="evaluation.matiere" required>
              <option value="mathematiques">Mathématiques</option>
              <option value="physique">Physique</option>
              <option value="reseau">Réseau</option>
              <option value="informatique">Informatique</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div class="input-group">
            <label>Durée (minutes) *</label>
            <input 
              v-model.number="evaluation.duree_minutes" 
              type="number" 
              min="5"
              required
            />
          </div>
        </div>

        <div class="input-group">
          <label>Barème total *</label>
          <input 
            v-model.number="evaluation.bareme_total" 
            type="number" 
            min="1"
            step="0.5"
            required
          />
        </div>

        <hr style="margin: 2rem 0; border: none; border-top: 2px solid var(--gray-200);">

        <!-- Liste des questions -->
        <div class="questions-section">
          <div class="flex-between mb-4">
            <h3>Questions ({{ evaluation.questions.length }})</h3>
            <button type="button" @click="ajouterQuestion" class="btn btn-primary">
              ➕ Ajouter une question
            </button>
          </div>

          <div v-if="evaluation.questions.length === 0" class="alert alert-info">
            Aucune question ajoutée. Cliquez sur "Ajouter une question" pour commencer.
          </div>

          <!-- Chaque question -->
          <div 
            v-for="(question, index) in evaluation.questions" 
            :key="index" 
            class="card question-card"
            style="background: var(--gray-50); border: 2px solid var(--gray-200);"
          >
            <div class="flex-between mb-4">
              <h4>Question {{ index + 1 }}</h4>
              <button 
                type="button" 
                @click="supprimerQuestion(index)" 
                class="btn btn-outline"
                style="padding: 0.5rem 1rem; color: var(--error);"
              >
                🗑️ Supprimer
              </button>
            </div>

            <div class="grid grid-2">
              <div class="input-group">
                <label>Type de question *</label>
                <select v-model="question.type" required>
                  <option value="qcm">QCM (Choix multiple)</option>
                  <option value="calcul">Calcul (Math/Physique)</option>
                  <option value="courte">Question courte</option>
                  <option value="longue">Question longue (développement)</option>
                </select>
              </div>

              <div class="input-group">
                <label>Points *</label>
                <input 
                  v-model.number="question.points_max" 
                  type="number" 
                  min="0.5"
                  step="0.5"
                  required
                />
              </div>
            </div>

            <div class="input-group">
              <label>Énoncé de la question *</label>
              <textarea 
                v-model="question.enonce" 
                rows="3"
                placeholder="Posez votre question ici..."
                required
              ></textarea>
            </div>

            <!-- Options pour QCM -->
            <div v-if="question.type === 'qcm'" class="qcm-options">
              <label>Options de réponse *</label>
              <div v-for="(option, optIndex) in question.options" :key="optIndex" class="flex" style="margin-bottom: 0.5rem;">
                <input 
                  v-model="question.options[optIndex]"
                  type="text"
                  :placeholder="`Option ${String.fromCharCode(65 + optIndex)}`"
                  required
                  style="flex: 1;"
                />
                <button 
                  v-if="question.options.length > 2"
                  type="button"
                  @click="question.options.splice(optIndex, 1)"
                  class="btn btn-outline"
                  style="padding: 0.5rem;"
                >
                  ✗
                </button>
              </div>
              <button 
                type="button" 
                @click="question.options.push('')"
                class="btn btn-outline"
                style="width: 100%; margin-top: 0.5rem;"
              >
                + Ajouter une option
              </button>

              <div class="input-group" style="margin-top: 1rem;">
                <label>Bonne réponse (lettre) *</label>
                <input 
                  v-model="question.reponse_attendue"
                  type="text"
                  placeholder="Ex: A, B, C, ou D"
                  maxlength="1"
                  required
                />
              </div>
            </div>

            <!-- Réponse attendue pour calculs et questions courtes -->
            <div v-if="question.type === 'calcul' || question.type === 'courte'" class="input-group">
              <label>Réponse attendue *</label>
              <input 
                v-model="question.reponse_attendue"
                type="text"
                :placeholder="question.type === 'calcul' ? 'Ex: 120' : 'Ex: Un identifiant unique...'"
                required
              />
            </div>

            <!-- Tolérance pour calculs -->
            <div v-if="question.type === 'calcul'" class="input-group">
              <label>Tolérance (optionnel)</label>
              <input 
                v-model.number="question.tolerance"
                type="number"
                step="0.01"
                placeholder="Ex: 0.1 (10%)"
              />
            </div>

            <!-- Critères pour questions longues -->
            <div v-if="question.type === 'longue'" class="input-group">
              <label>Critères d'évaluation (optionnel)</label>
              <textarea 
                v-model="question.criteres_text"
                rows="3"
                placeholder="Un critère par ligne, ex:&#10;Clarté de l'expression&#10;Argumentation&#10;Exemples concrets"
              ></textarea>
              <small class="text-muted">Ces critères seront utilisés par l'IA pour évaluer la réponse</small>
            </div>

            <!-- Réponse type pour questions longues -->
            <div v-if="question.type === 'longue'" class="input-group">
              <label>Éléments de réponse attendus (optionnel)</label>
              <textarea 
                v-model="question.reponse_attendue"
                rows="4"
                placeholder="Décrivez les points clés que devrait contenir une bonne réponse..."
              ></textarea>
            </div>
          </div>
        </div>

        <div class="form-actions flex" style="justify-content: space-between; margin-top: 2rem;">
          <button type="button" @click="resetForm" class="btn btn-outline">
            🔄 Réinitialiser
          </button>
          <button type="submit" class="btn btn-success" :disabled="loading">
            <span v-if="loading" class="loading"></span>
            <span v-else>✓ Créer l'épreuve</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Message de succès -->
    <div v-if="success" class="alert alert-success mt-4">
      ✓ Épreuve "{{ evaluation.titre }}" créée avec succès ! 
      <router-link to="/etudiant/examens">Voir les examens disponibles</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEvaluationStore } from '../stores/evaluationStore'

const store = useEvaluationStore()
const loading = ref(false)
const success = ref(false)

const evaluation = ref({
  titre: '',
  matiere: 'reseau',
  duree_minutes: 60,
  bareme_total: 20,
  questions: []
})

function ajouterQuestion() {
  evaluation.value.questions.push({
    id: `q${evaluation.value.questions.length + 1}`,
    type: 'qcm',
    matiere: evaluation.value.matiere,
    enonce: '',
    points_max: 2,
    reponse_attendue: '',
    options: ['', '', '', ''],
    tolerance: null,
    criteres_text: '',
    criteres_evaluation: []
  })
}

function supprimerQuestion(index) {
  if (confirm('Supprimer cette question ?')) {
    evaluation.value.questions.splice(index, 1)
  }
}

function resetForm() {
  if (confirm('Réinitialiser le formulaire ? Toutes les données seront perdues.')) {
    evaluation.value = {
      titre: '',
      matiere: 'reseau',
      duree_minutes: 60,
      bareme_total: 20,
      questions: []
    }
    success.value = false
  }
}

function creerEpreuve() {
  loading.value = true
  success.value = false

  try {
    // Préparer les questions
    const questions = evaluation.value.questions.map(q => {
      const question = {
        id: q.id,
        type: q.type,
        matiere: q.matiere,
        enonce: q.enonce,
        points_max: q.points_max,
        reponse_attendue: q.reponse_attendue
      }

      if (q.type === 'qcm') {
        question.options = q.options.filter(opt => opt.trim() !== '')
      }

      if (q.type === 'calcul' && q.tolerance) {
        question.tolerance = q.tolerance
      }

      if (q.type === 'longue' && q.criteres_text) {
        question.criteres_evaluation = q.criteres_text
          .split('\n')
          .map(c => c.trim())
          .filter(c => c !== '')
      }

      return question
    })

    // Sauvegarder dans le store
    store.ajouterEvaluation({
      titre: evaluation.value.titre,
      matiere: evaluation.value.matiere,
      duree_minutes: evaluation.value.duree_minutes,
      bareme_total: evaluation.value.bareme_total,
      questions
    })

    success.value = true
    
    // Réinitialiser après 2 secondes
    setTimeout(() => {
      resetForm()
      success.value = false
    }, 3000)

  } catch (error) {
    alert('Erreur lors de la création: ' + error.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.question-card {
  margin-bottom: 1.5rem;
}

hr {
  margin: 2rem 0;
}
</style>
