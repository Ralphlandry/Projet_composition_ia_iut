<template>
  <div class="import-pdf">
    <div class="card">
      <div class="card-header">📄 Importer une Épreuve depuis un PDF</div>
      
      <div class="alert alert-info">
        <strong>ℹ️ Comment ça marche ?</strong>
        <ul style="margin: 0.5rem 0 0 1.5rem;">
          <li>Uploadez un PDF contenant votre épreuve</li>
          <li>Le texte sera extrait automatiquement</li>
          <li>Vous pourrez transformer le texte en questions structurées</li>
          <li>Modifiez et validez avant de créer l'épreuve</li>
        </ul>
      </div>

      <!-- Zone d'upload -->
      <div 
        class="upload-zone"
        :class="{ 'dragging': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
        @click="$refs.fileInput.click()"
      >
        <div v-if="!pdfFile" class="upload-content">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📁</div>
          <p style="font-size: 1.25rem; margin-bottom: 0.5rem;">
            Glissez-déposez un PDF ici
          </p>
          <p class="text-muted">ou cliquez pour sélectionner un fichier</p>
        </div>
        <div v-else class="upload-content">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
          <p style="font-size: 1.25rem; margin-bottom: 0.5rem;">
            {{ pdfFile.name }}
          </p>
          <p class="text-muted">{{ (pdfFile.size / 1024).toFixed(2) }} KB</p>
          <button 
            type="button" 
            @click.stop="pdfFile = null; extractedText = ''"
            class="btn btn-outline"
            style="margin-top: 1rem;"
          >
            Changer de fichier
          </button>
        </div>
        <input 
          ref="fileInput"
          type="file" 
          accept=".pdf"
          @change="handleFileSelect"
          style="display: none;"
        />
      </div>

      <!-- Bouton d'extraction -->
      <div v-if="pdfFile && !extractedText" class="text-center" style="margin-top: 2rem;">
        <button @click="extractText" class="btn btn-primary" :disabled="extracting">
          <span v-if="extracting" class="loading"></span>
          <span v-else>🔍 Extraire le texte du PDF</span>
        </button>
      </div>

      <!-- Texte extrait -->
      <div v-if="extractedText" style="margin-top: 2rem;">
        <div class="card" style="background: var(--gray-50);">
          <h3>Texte extrait du PDF :</h3>
          <textarea 
            v-model="extractedText" 
            rows="15"
            style="width: 100%; padding: 1rem; border: 2px solid var(--gray-300); border-radius: 0.5rem; font-family: monospace;"
            placeholder="Le texte extrait apparaîtra ici..."
          ></textarea>
          <p class="text-muted">Vous pouvez modifier le texte avant de le transformer en questions</p>
        </div>

        <!-- Transformation en questions -->
        <div class="card mt-4">
          <h3>⚙️ Transformer en Questions</h3>
          <p class="text-muted">
            L'assistant va analyser le texte et créer des questions. Vous pourrez les modifier après.
          </p>

          <div class="input-group">
            <label>Matière de l'épreuve</label>
            <select v-model="matiere">
              <option value="mathematiques">Mathématiques</option>
              <option value="physique">Physique</option>
              <option value="reseau">Réseau</option>
              <option value="informatique">Informatique</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <button 
            @click="transformerEnQuestions" 
            class="btn btn-primary"
            :disabled="transforming"
          >
            <span v-if="transforming" class="loading"></span>
            <span v-else>🤖 Transformer en questions (IA)</span>
          </button>
        </div>

        <!-- Questions générées -->
        <div v-if="questionsGenerees.length > 0" class="card mt-4">
          <h3>✅ Questions Générées ({{ questionsGenerees.length }})</h3>
          
          <div class="alert alert-success">
            {{ questionsGenerees.length }} question(s) ont été générées. Vérifiez et modifiez-les si nécessaire.
          </div>

          <div 
            v-for="(q, index) in questionsGenerees" 
            :key="index"
            class="card question-card"
            style="background: var(--gray-50); margin-bottom: 1rem;"
          >
            <div class="flex-between">
              <h4>Question {{ index + 1 }}</h4>
              <span class="badge badge-info">{{ q.type.toUpperCase() }}</span>
            </div>
            
            <div class="input-group">
              <label>Énoncé</label>
              <textarea v-model="q.enonce" rows="2"></textarea>
            </div>

            <div class="grid grid-2">
              <div class="input-group">
                <label>Type</label>
                <select v-model="q.type">
                  <option value="qcm">QCM</option>
                  <option value="calcul">Calcul</option>
                  <option value="courte">Courte</option>
                  <option value="longue">Longue</option>
                </select>
              </div>
              <div class="input-group">
                <label>Points</label>
                <input v-model.number="q.points_max" type="number" step="0.5">
              </div>
            </div>

            <div class="input-group">
              <label>Réponse attendue</label>
              <input v-model="q.reponse_attendue" type="text">
            </div>

            <div v-if="q.type === 'qcm' && q.options" class="input-group">
              <label>Options</label>
              <div v-for="(opt, i) in q.options" :key="i" style="margin-bottom: 0.5rem;">
                <input v-model="q.options[i]" type="text">
              </div>
            </div>

            <button 
              @click="questionsGenerees.splice(index, 1)"
              class="btn btn-outline"
              style="margin-top: 1rem; color: var(--error);"
            >
              🗑️ Supprimer cette question
            </button>
          </div>

          <div class="form-actions flex" style="justify-content: space-between; margin-top: 2rem;">
            <button @click="resetImport" class="btn btn-outline">
              🔄 Recommencer
            </button>
            <button @click="creerEpreuve" class="btn btn-success">
              ✓ Créer l'épreuve avec ces questions
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Succès -->
    <div v-if="success" class="alert alert-success mt-4">
      ✓ Épreuve créée avec succès ! 
      <router-link to="/etudiant/examens">Voir les examens disponibles</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEvaluationStore } from '../stores/evaluationStore'
import * as pdfjsLib from 'pdfjs-dist'

// Configurer le worker PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const store = useEvaluationStore()

const pdfFile = ref(null)
const dragging = ref(false)
const extracting = ref(false)
const transforming = ref(false)
const extractedText = ref('')
const matiere = ref('reseau')
const questionsGenerees = ref([])
const success = ref(false)

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file && file.type === 'application/pdf') {
    pdfFile.value = file
  } else {
    alert('Veuillez sélectionner un fichier PDF')
  }
}

function handleDrop(event) {
  dragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type === 'application/pdf') {
    pdfFile.value = file
  } else {
    alert('Veuillez déposer un fichier PDF')
  }
}

async function extractText() {
  extracting.value = true
  
  try {
    const arrayBuffer = await pdfFile.value.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n\n'
    }
    
    extractedText.value = fullText.trim()
    
  } catch (error) {
    alert('Erreur lors de l\'extraction du texte: ' + error.message)
    console.error(error)
  } finally {
    extracting.value = false
  }
}

function transformerEnQuestions() {
  transforming.value = true
  
  // Simulation de transformation (en production, utiliser une vraie IA)
  setTimeout(() => {
    // Exemple de parsing basique
    const lignes = extractedText.value.split('\n').filter(l => l.trim())
    
    // Détecter les questions (lignes se terminant par ?)
    const questions = []
    
    lignes.forEach((ligne, index) => {
      if (ligne.includes('?')) {
        // C'est probablement une question
        questions.push({
          id: `q${questions.length + 1}`,
          type: 'courte', // Par défaut
          matiere: matiere.value,
          enonce: ligne.trim(),
          points_max: 2,
          reponse_attendue: '',
          options: []
        })
      } else if (ligne.match(/^[A-D][\.\)]/)) {
        // C'est une option de QCM
        if (questions.length > 0) {
          const derniere = questions[questions.length - 1]
          if (!derniere.options) derniere.options = []
          derniere.options.push(ligne.trim())
          derniere.type = 'qcm'
        }
      }
    })
    
    // Si pas de questions détectées, créer une question exemple
    if (questions.length === 0) {
      questions.push({
        id: 'q1',
        type: 'longue',
        matiere: matiere.value,
        enonce: extractedText.value.substring(0, 200) + '...',
        points_max: 10,
        reponse_attendue: 'À compléter...',
        options: []
      })
    }
    
    questionsGenerees.value = questions
    transforming.value = false
  }, 1500)
}

function creerEpreuve() {
  const titre = prompt('Titre de l\'épreuve:', pdfFile.value.name.replace('.pdf', ''))
  if (!titre) return
  
  const duree = parseInt(prompt('Durée en minutes:', '60'))
  const bareme = questionsGenerees.value.reduce((sum, q) => sum + q.points_max, 0)
  
  store.ajouterEvaluation({
    titre,
    matiere: matiere.value,
    duree_minutes: duree,
    bareme_total: bareme,
    questions: questionsGenerees.value
  })
  
  success.value = true
  setTimeout(() => {
    resetImport()
  }, 3000)
}

function resetImport() {
  pdfFile.value = null
  extractedText.value = ''
  questionsGenerees.value = []
  success.value = false
}
</script>

<style scoped>
.upload-zone {
  border: 3px dashed var(--gray-300);
  border-radius: 1rem;
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--gray-50);
  margin: 2rem 0;
}

.upload-zone:hover,
.upload-zone.dragging {
  border-color: var(--primary);
  background: #eff6ff;
}

.upload-content {
  pointer-events: none;
}

.question-card {
  border: 2px solid var(--gray-300);
}
</style>
