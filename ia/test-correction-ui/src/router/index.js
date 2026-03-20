import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CreerEpreuveView from '../views/CreerEpreuveView.vue'
import ImportPdfView from '../views/ImportPdfView.vue'
import ExamensView from '../views/ExamensView.vue'
import PasserExamenView from '../views/PasserExamenView.vue'
import ResultatsView from '../views/ResultatsView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/enseignant/creer',
    name: 'creer-epreuve',
    component: CreerEpreuveView
  },
  {
    path: '/enseignant/import-pdf',
    name: 'import-pdf',
    component: ImportPdfView
  },
  {
    path: '/etudiant/examens',
    name: 'examens',
    component: ExamensView
  },
  {
    path: '/etudiant/passer/:id',
    name: 'passer-examen',
    component: PasserExamenView
  },
  {
    path: '/resultats',
    name: 'resultats',
    component: ResultatsView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
