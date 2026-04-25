<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { authState, authApi } from '@/services/auth.service'
import { LogOut } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const handleLogout = async () => {
  await authApi.logout()
  router.push('/')
}
</script>

<template>
  <nav class="sticky top-0 z-50 w-full border-b border-[#1e2532] bg-[#0f1319]">
    <div class="flex w-full h-16 items-center justify-between px-6 lg:px-8">
      <div class="flex items-center gap-12">
        <RouterLink to="/" class="font-black text-xl tracking-tighter text-[#00ed64]">
          MONGOCRAFT
        </RouterLink>
        <div class="hidden md:flex items-center h-full space-x-8 text-sm font-medium text-[#8a94a6]">
          <RouterLink
            to="/"
            :class="[
              'h-16 flex items-center border-b-2 transition-colors',
              route.path === '/' ? 'text-[#00ed64] border-[#00ed64]' : 'border-transparent hover:text-white'
            ]"
          >Home</RouterLink>
          <template v-if="authState.isAuthenticated">
            <RouterLink
              to="/challenges"
              :class="[
                'h-16 flex items-center border-b-2 transition-colors',
                route.path === '/challenges' ? 'text-[#00ed64] border-[#00ed64]' : 'border-transparent hover:text-white'
              ]"
            >Challenges</RouterLink>
          </template>
          <RouterLink
            to="/leaderboard"
            :class="[
              'h-16 flex items-center border-b-2 transition-colors',
              route.path === '/leaderboard' ? 'text-[#00ed64] border-[#00ed64]' : 'border-transparent hover:text-white'
            ]"
          >Leaderboard</RouterLink>
          <RouterLink
            v-if="authState.user?.role === 'admin'"
            to="/admin"
            :class="[
              'h-16 flex items-center border-b-2 transition-colors',
              route.path === '/admin' ? 'text-[#00ed64] border-[#00ed64]' : 'border-transparent hover:text-white'
            ]"
          >Admin Console</RouterLink>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <template v-if="authState.isAuthenticated">
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono text-[#8a94a6] hidden sm:block">{{ authState.user?.username }}</span>
            <div class="group relative">
              <div class="h-8 w-8 rounded-sm bg-[#1e2532] border border-[#1e2532] overflow-hidden cursor-pointer hover:border-[#00ed64] transition-colors">
                <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${authState.user?.username}`" alt="avatar" />
              </div>
              
              <!-- Simple Dropdown -->
              <div class="absolute right-0 top-full mt-2 w-48 bg-[#1a202a] border border-[#1e2532] rounded-sm shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-1 z-[60]">
                <button 
                  @click="handleLogout"
                  class="w-full px-4 py-2 text-left text-xs font-mono text-[#8a94a6] hover:bg-[#0f1319] hover:text-white flex items-center gap-2"
                >
                  <LogOut class="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <RouterLink 
            to="/" 
            class="text-xs font-mono text-[#8a94a6] hover:text-[#00ed64] transition-colors"
          >
            Login
          </RouterLink>
        </template>
      </div>
    </div>
  </nav>
</template>

