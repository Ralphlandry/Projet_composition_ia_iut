import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const correctionApi = {
  // Vérifier l'état de l'API
  async healthCheck() {
    const { data } = await api.get('/health')
    return data
  },

  // Corriger une question unique
  async corrigerQuestion(question, reponse) {
    const { data } = await api.post('/api/corriger-question', {
      question,
      reponse
    })
    return data
  },

  // Corriger une copie complète
  async corrigerCopie(evaluation, copie) {
    const { data } = await api.post('/api/corriger-copie', {
      evaluation,
      copie
    })
    return data
  },

  // Corriger plusieurs copies
  async corrigerPlusieurs(evaluation, copies) {
    const { data } = await api.post('/api/corriger-copies', {
      evaluation,
      copies
    })
    return data
  },

  // Obtenir types de questions supportés
  async getTypesQuestions() {
    const { data } = await api.get('/api/types-questions')
    return data
  },

  // Obtenir matières supportées
  async getMatieres() {
    const { data } = await api.get('/api/matieres')
    return data
  }
}

export default api
