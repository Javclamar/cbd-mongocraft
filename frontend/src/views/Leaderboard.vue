<script setup lang="ts">
import { apiFetch, authState } from '@/lib/api';
import { Loader2, Medal, Star, Trophy } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';

const leaderboard = ref<any[]>([]);
const loading = ref(true);

const fetchLeaderboard = async () => {
  loading.value = true;
  try {
    const data = await apiFetch<any>('/users/leaderboard?limit=50');
    leaderboard.value = data.items || [];
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchLeaderboard();
});

const podium = computed(() => {
  if (leaderboard.value.length === 0) return [];
  // Aggressive sorting just in case, though backend should handle it
  const sorted = [...leaderboard.value].sort((a, b) => a.rank - b.rank);
  
  const result = [];
  if (sorted[1]) result.push(sorted[1]); // 2nd
  if (sorted[0]) result.push(sorted[0]); // 1st
  if (sorted[2]) result.push(sorted[2]); // 3rd
  return result;
});

const remainingUsers = computed(() => {
  return leaderboard.value.filter(user => user.rank > 3);
});

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1: return 'text-yellow-400';
    case 2: return 'text-gray-300';
    case 3: return 'text-amber-600';
    default: return 'text-[#8a94a6]';
  }
};

const getPodiumClass = (rank: number) => {
  switch (rank) {
    case 1: return 'h-64 bg-gradient-to-t from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
    case 2: return 'h-52 bg-gradient-to-t from-gray-400/20 to-gray-400/5 border-gray-400/30 mt-12';
    case 3: return 'h-44 bg-gradient-to-t from-amber-700/20 to-amber-700/5 border-amber-700/30 mt-20';
    default: return '';
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#0f1319] text-white flex flex-col font-sans">
    <main class="flex-grow p-8 max-w-5xl mx-auto w-full flex flex-col">
      
      <div class="mb-12 text-center">
        <h1 class="text-4xl font-black tracking-tight text-white mb-2">Leaderboard</h1>
        <p class="text-[#8a94a6]">The top players of Mongocraft</p>
      </div>

      <div v-if="loading" class="flex-grow flex items-center justify-center">
        <Loader2 class="w-12 h-12 text-[#00ed64] animate-spin" />
      </div>

      <template v-else>
        <!-- Podium -->
        <div class="grid grid-cols-3 gap-4 mb-16 items-end">
          <div 
            v-for="user in podium" 
            :key="user.user.id"
            :class="['relative border rounded-md flex flex-col items-center p-6 transition-all hover:scale-105', getPodiumClass(user.rank)]"
          >
            <div 
              class="absolute -top-6 w-12 h-12 rounded-full bg-[#13171e] border-2 flex items-center justify-center"
              :class="user.rank === 1 ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : user.rank === 2 ? 'border-gray-400' : 'border-amber-700'"
            >
              <Trophy v-if="user.rank === 1" class="w-6 h-6 text-yellow-500" />
              <Medal v-else-if="user.rank === 2" class="w-6 h-6 text-gray-400" />
              <Medal v-else class="w-6 h-6 text-amber-700" />
            </div>

            <div class="mt-4 mb-4">
              <img 
                :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user.username}`" 
                class="w-20 h-20 rounded-full bg-[#1e2532] border-2 border-[#1e2532]"
              />
            </div>

            <div class="text-center">
              <p class="font-bold text-lg leading-tight">{{ user.user.username }}</p>
              <p class="text-xs font-mono text-[#8a94a6] uppercase tracking-wider mb-2">Rank {{ user.rank }}</p>
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <Star class="w-3.5 h-3.5 text-[#00ed64] fill-[#00ed64]" />
                <span class="text-lg font-black text-[#00ed64]">{{ user.user.stats?.totalScore || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Leaderboard Table -->
        <div class="bg-[#13171e] border border-[#1e2532] rounded-md overflow-hidden mb-12 shadow-2xl">
          <table class="w-full text-left text-sm">
            <thead class="bg-[#0f1319] text-[#8a94a6] font-mono text-xs uppercase">
              <tr>
                <th class="px-6 py-4 font-medium w-24">Rank</th>
                <th class="px-6 py-4 font-medium">User</th>
                <th class="px-6 py-4 font-medium text-right">Solved</th>
                <th class="px-6 py-4 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1e2532]">
              <tr 
                v-for="entry in remainingUsers" 
                :key="entry.user.id" 
                :class="[
                  'hover:bg-[#1e2532]/30 transition-colors',
                  authState.user?.username === entry.user.username ? 'bg-[#00ed64]/5 border-l-4 border-l-[#00ed64]' : ''
                ]"
              >
                <td class="px-6 py-4 font-mono font-bold" :class="getRankColor(entry.rank)">
                  #{{ entry.rank }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <img 
                      :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user.username}`" 
                      class="w-8 h-8 rounded bg-[#1e2532]" 
                    />
                    <div>
                      <p class="font-bold text-white">{{ entry.user.username }}</p>
                      <p v-if="authState.user?.username === entry.user.username" class="text-[10px] text-[#00ed64] uppercase font-bold tracking-tighter">You</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 font-mono text-right text-[#8a94a6]">
                  {{ entry.user.stats?.solvedChallenges?.length || 0 }}
                </td>
                <td class="px-6 py-4 font-black text-right text-[#00ed64] text-lg">
                  {{ entry.user.stats?.totalScore || 0 }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

    </main>
  </div>
</template>

<style scoped>
.podium-1 {
  order: 2;
}
.podium-2 {
  order: 1;
}
.podium-3 {
  order: 3;
}
</style>
