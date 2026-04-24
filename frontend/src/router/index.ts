import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Challenges from '@/views/Challenges.vue'
import ChallengePlayground from '@/views/ChallengePlayground.vue'

import AdminDashboard from '@/views/AdminDashboard.vue'
import Leaderboard from '@/views/Leaderboard.vue'
import { authState } from '@/services/auth.service'

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
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: Leaderboard
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboard,
      beforeEnter: (_to, _from, next) => {
        if (!authState.isAuthenticated || authState.user?.role !== 'admin') {
          next('/');
        } else {
          next();
        }
      }
    }
  ]
})

export default router
