import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEvaluationStore = defineStore('evaluation', () => {
  const evaluations = ref([])
  const resultats = ref([])

  function ajouterEvaluation(evaluation) {
    evaluations.value.push({
      ...evaluation,
      id: `eval_${Date.now()}`,
      date_creation: new Date().toISOString()
    })
  }

  function getEvaluation(id) {
    return evaluations.value.find(e => e.id === id)
  }

  function ajouterResultat(resultat) {
    resultats.value.push({
      ...resultat,
      date: new Date().toISOString()
    })
  }

  function getResultatsEleve(eleveId) {
    return resultats.value.filter(r => r.copie.eleve_id === eleveId)
  }

  return {
    evaluations,
    resultats,
    ajouterEvaluation,
    getEvaluation,
    ajouterResultat,
    getResultatsEleve
  }
})
