import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Challenges from '@/views/Challenges.vue'
import ChallengePlayground from '@/views/ChallengePlayground.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/challenges',
      name: 'challenges',
      component: Challenges
    },
    {
      path: '/challenges/:id',
      name: 'challenge-playground',
      component: ChallengePlayground
    }
  ]
})

export default router
