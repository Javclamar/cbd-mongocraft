<script setup lang="ts">
import { ArrowRight, BookOpen, CheckCircle2, Circle, Clock, Star, Loader2 } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import { authState } from '@/services/auth.service'
import { challengesService } from '@/services/challenges.service'
import { usersService } from '@/services/users.service'
import { submissionsService } from '@/services/submissions.service'

const activeDifficulty = ref('All')
const loading = ref(true)

const difficulties = ['All', 'Easy', 'Medium', 'Hard']

interface Challenge {
  id: string
  title: string
  description: string
  tags: string[]
  difficulty: 'Easy' | 'Medium' | 'Hard'
  points: number
  successRate: number
  status: 'completed' | 'in-progress' | 'locked'
}

interface UserLeaderboardInfo {
  rank: number
  isCurrentUser: boolean
  user: {
    id: string
    username: string
    stats?: {
      totalScore: number
    }
  }
}

const challenges = ref<Challenge[]>([])
const userRankInfo = ref<UserLeaderboardInfo | null>(null)

const player = computed(() => {
  if (userRankInfo.value?.user) {
    return {
      position: userRankInfo.value.rank,
      totalPoints: userRankInfo.value.user.stats?.totalScore || 0,
      username: userRankInfo.value.user.username,
    }
  }
  return {
    position: '?',
    totalPoints: 0,
    username: authState.user?.username || 'Guest',
  }
})

async function fetchData() {
  loading.value = true
  try {
    const [challengesData, rankData, statusData] = await Promise.all([
      challengesService.list(),
      authState.isAuthenticated ? usersService.getMyLeaderboardContext() : Promise.resolve(null),
      authState.isAuthenticated ? submissionsService.getMyChallengeStatuses() : Promise.resolve({} as Record<string, import('@/services/submissions.service').ChallengeStatusInfo>),
    ])

    challenges.value = challengesData.map(c => ({
      id: c._id,
      title: c.title,
      description: c.description,
      tags: c.tags || [],
      difficulty: (c.difficulty ? c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1) : 'Medium') as 'Easy' | 'Medium' | 'Hard',
      points: c.points || 100,
      successRate: c.successRate || 0,
      status: statusData[c._id]?.status || 'locked',
    }))

    if (rankData && rankData.user) {
      userRankInfo.value = rankData.user
    }
  } catch (err) {
    console.error('Failed to fetch data:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const filteredChallenges = computed(() => {
  return challenges.value.filter((c) => {
    return activeDifficulty.value === 'All' || c.difficulty === activeDifficulty.value
  })
})

function setDifficulty(d: string) {
  activeDifficulty.value = d
}

const difficultyColors: Record<string, string> = {
  Easy: 'text-[#00ed64] bg-[#00ed64]/10 border-[#00ed64]/20',
  Medium: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20',
  Hard: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20',
}

const difficultyBar: Record<string, string> = {
  Easy: 'bg-[#00ed64]',
  Medium: 'bg-[#f59e0b]',
  Hard: 'bg-[#ef4444]',
}
</script>

<template>
  <div class="flex-grow bg-[#0f1319] min-h-screen text-white px-6 py-10 lg:px-16">
    
    <div class="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
      <div>
        <h1 class="text-4xl font-black tracking-tight text-white mb-1">Challenges</h1>
        <p class="text-[#8a94a6] text-sm">
          Welcome back, <span class="text-[#00ed64] font-mono">{{ player.username }}</span>. Let's go!
        </p>
        <router-link v-if="authState.user?.role === 'admin'" to="/admin" class="mt-4 inline-block bg-[#1e2532]/50 border border-[#1e2532] text-[#8a94a6] hover:text-white hover:border-[#00ed64]/50 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-colors">
          Admin Console
        </router-link>
      </div>

      <div class="bg-[#13171e] border border-[#1e2532] rounded-sm p-5 flex gap-8">
        <div class="border-r border-[#1e2532] pr-8">
          <p class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6] mb-2">Current Position</p>
          <p class="text-3xl font-black text-white font-mono">
            #{{ player.position }}
          </p>
        </div>

        <div>
          <p class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6] mb-2">Total Points</p>
          <p class="text-3xl font-black font-mono">
            <span class="text-[#00ed64]">{{ player.totalPoints.toLocaleString() }}</span>
            <span class="text-[#8a94a6] text-sm ml-1">pts</span>
          </p>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center justify-start gap-4 mb-6">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6] mr-1">Difficulty:</span>
        <button
          v-for="d in difficulties"
          :key="d"
          @click="setDifficulty(d)"
          :class="[
            'px-3 py-1.5 text-xs font-semibold rounded-sm border transition-colors',
            activeDifficulty === d
              ? 'bg-[#00ed64] text-black border-[#00ed64]'
              : 'bg-transparent text-[#8a94a6] border-[#1e2532] hover:border-[#00ed64]/50 hover:text-white'
          ]"
        >
          {{ d }}
        </button>
      </div>
    </div>

    <div class="bg-[#13171e] border border-[#1e2532] rounded-sm overflow-hidden mb-8">
      <div class="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 items-center px-6 py-3 border-b border-[#1e2532] bg-[#0f1319]">
        <span class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6]">Status</span>
        <span class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6]">Title</span>
        <span class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6] hidden md:block">Difficulty</span>
        <span class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6] hidden sm:block text-right">Reward</span>
        <span class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6] text-right">Action</span>
      </div>

      <div v-if="loading" class="py-20 flex flex-col items-center justify-center gap-4">
        <Loader2 class="w-8 h-8 text-[#00ed64] animate-spin" />
        <p class="text-[#8a94a6] font-mono text-sm">Loading challenges...</p>
      </div>

      <div
        v-else
        v-for="challenge in filteredChallenges"
        :key="challenge.id"
        :class="[
          'grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 items-center px-6 py-5 border-b border-[#1e2532] last:border-0 transition-colors hover:bg-[#1a202a] group',
        ]"
      >
        <div class="flex items-center justify-center">
          <CheckCircle2
            v-if="challenge.status === 'completed'"
            class="w-5 h-5 text-[#00ed64]"
          />
          <Clock
            v-else-if="challenge.status === 'in-progress'"
            class="w-5 h-5 text-[#f59e0b]"
          />
          <Circle
            v-else
            class="w-5 h-5 text-[#1e2532]"
          />
        </div>

        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="font-bold text-white text-sm leading-tight">{{ challenge.title }}</span>
            <span
              v-for="tag in challenge.tags"
              :key="tag"
              class="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-sm border border-[#00ed64]/20 text-[#00ed64]/80 bg-[#00ed64]/5"
            >
              {{ tag }}
            </span>
          </div>
          <p class="text-[11px] text-[#8a94a6] font-mono truncate">{{ challenge.description }}</p>
          <div class="flex items-center gap-2 mt-2">
            <div class="w-24 h-1 bg-[#1e2532] rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="difficultyBar[challenge.difficulty]"
                :style="{ width: challenge.successRate + '%' }"
              />
            </div>
            <span class="text-[10px] font-mono text-[#8a94a6]">{{ challenge.successRate }}%</span>
            <span class="text-[10px] font-mono text-[#8a94a6]">Success Rate</span>
          </div>
        </div>

        <div class="hidden md:flex">
          <span
            :class="[
              'px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm border',
              difficultyColors[challenge.difficulty]
            ]"
          >
            {{ challenge.difficulty }}
          </span>
        </div>

        <div class="hidden sm:flex justify-end">
          <span class="font-mono font-bold text-sm text-white">
            +{{ challenge.points }} <span class="text-[#00ed64] text-xs">Points</span>
          </span>
        </div>

        <div class="flex justify-end">
          <router-link
            v-if="challenge.status === 'completed'"
            :to="'/challenges/' + challenge.id"
            class="text-[11px] font-mono text-[#8a94a6] hover:text-white transition-colors border border-[#1e2532] px-3 py-1.5 rounded-sm hover:border-white/30"
          >
            Review
          </router-link>
          <router-link
            v-else-if="challenge.status === 'in-progress'"
            :to="'/challenges/' + challenge.id"
            class="text-[11px] font-mono font-bold text-black bg-[#00ed64] hover:bg-[#00ed64]/90 px-4 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors inline-flex"
          >
            Continue <ArrowRight class="w-3 h-3" />
          </router-link>
          <router-link
            v-else
            :to="'/challenges/' + challenge.id"
            class="text-[11px] font-mono text-[#8a94a6] hover:text-[#00ed64] transition-colors border border-[#1e2532] hover:border-[#00ed64]/50 px-3 py-1.5 rounded-sm"
          >
            Start
          </router-link>
        </div>
      </div>

      <div v-if="!loading && filteredChallenges.length === 0" class="py-16 text-center">
        <p class="text-[#8a94a6] font-mono text-sm">No challenges match your current filters.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-[#13171e] border border-[#1e2532] rounded-sm p-6">
        <div class="flex items-center gap-2 mb-4">
          <Star class="w-4 h-4 text-[#00ed64]" />
          <h3 class="font-black text-lg tracking-tight">Aggregation Pro-Tip</h3>
        </div>
        <p class="text-sm text-[#8a94a6] leading-relaxed mb-4">
          Minimize documents early. Always place
          <code class="px-1 py-0.5 bg-[#0f1319] rounded-sm text-[#00ed64] font-mono text-xs border border-[#1e2532]">$match</code>
          and
          <code class="px-1 py-0.5 bg-[#0f1319] rounded-sm text-[#00ed64] font-mono text-xs border border-[#1e2532]">$project</code>
          stages as early in the pipeline as possible to reduce memory usage.
        </p>
        <a href="#" class="inline-flex items-center gap-1.5 text-[#00ed64] text-xs font-mono hover:underline underline-offset-4">
          <BookOpen class="w-3.5 h-3.5" />
          Read documentation →
        </a>
      </div>

      <div class="bg-[#0f1319] border border-[#1e2532] rounded-sm p-5 font-mono text-[11px] leading-relaxed">
        <div class="flex items-center gap-2 mb-4">
          <div class="flex gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
          </div>
          <span class="text-[#8a94a6] text-xs ml-2">tip.js</span>
        </div>
        <div class="text-[#8a94a6] space-y-0.5">
          <div><span class="text-[#79c0ff]">db</span>.orders.<span class="text-[#d2a8ff]">aggregate</span>([</div>
          <div class="pl-4">{ <span class="text-[#ff7b72]">$match</span>: { status: <span class="text-[#a5d6ff]">"A"</span> } },</div>
          <div class="pl-4">{ <span class="text-[#ff7b72]">$group</span>: {</div>
          <div class="pl-8">_id: <span class="text-[#a5d6ff]">"$cust_id"</span>,</div>
          <div class="pl-8">total: { <span class="text-[#ff7b72]">$sum</span>: <span class="text-[#a5d6ff]">"$amount"</span> }</div>
          <div class="pl-4">}}</div>
          <div>]);</div>
        </div>
      </div>
    </div>
  </div>
</template>
