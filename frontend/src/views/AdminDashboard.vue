<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { authApi } from '@/services/auth.service';
import { adminService } from '@/services/admin.service';
import { useRouter } from 'vue-router';
import { LogOut, Plus, Trash2, Check, X, Shield, Activity, Users, FileCode2 } from 'lucide-vue-next';

const router = useRouter();

const summary = ref({
  users: 0,
  challenges: 0,
  activeChallenges: 0,
  inactiveChallenges: 0,
  submissions: 0,
  pendingSubmissions: 0,
});

const challenges = ref<any[]>([]);
const users = ref<any[]>([]);
const loading = ref(true);

const showForm = ref(false);
const editingId = ref<string | null>(null);
const newChallenge = ref({
  title: '',
  description: '',
  datasetCollection: '',
  difficulty: 'easy',
  points: 100,
  expectedResult: '',
  baselineQuery: '',
  notes: '',
});

onMounted(async () => {
  await fetchData();
});

const fetchData = async () => {
  loading.value = true;
  try {
    const summaryData = await adminService.getSummary();
    summary.value = summaryData;

    const challengesData = await adminService.getChallenges(100, true);
    challenges.value = challengesData.items || [];

    const usersData = await adminService.getUsers(100);
    users.value = usersData.items || [];
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleLogout = async () => {
  await authApi.logout();
  router.push('/');
};

const toggleChallengeStatus = async (id: string, currentStatus: boolean) => {
  try {
    await adminService.setChallengeActive(id, !currentStatus);
    await fetchData();
  } catch (error) {
    console.error(error);
  }
};

const createChallenge = async () => {
  try {
    let parsedExpectedResult;
    let parsedBaselineQuery;
    
    try {
      parsedExpectedResult = JSON.parse(newChallenge.value.expectedResult);
      parsedBaselineQuery = JSON.parse(newChallenge.value.baselineQuery);
    } catch (e) {
      alert('Invalid JSON in expected result or baseline query');
      return;
    }

    const payload = {
      ...newChallenge.value,
      expectedResult: parsedExpectedResult,
      baselineQuery: parsedBaselineQuery,
      notes: newChallenge.value.notes.split('\n').filter((n: string) => n.trim() !== '')
    };

    if (editingId.value) {
      await adminService.updateChallenge(editingId.value, payload);
    } else {
      await adminService.createChallenge(payload);
    }

    cancelForm();
    await fetchData();
  } catch (error: any) {
    alert(error.message || 'Failed to save challenge');
  }
};

const cancelForm = () => {
  showForm.value = false;
  editingId.value = null;
  newChallenge.value = {
    title: '',
    description: '',
    datasetCollection: '',
    difficulty: 'easy',
    points: 100,
    expectedResult: '',
    baselineQuery: '',
    notes: '',
  };
};

const editChallenge = (challenge: any) => {
  editingId.value = challenge._id;
  newChallenge.value = {
    title: challenge.title || '',
    description: challenge.description || '',
    datasetCollection: challenge.datasetCollection || '',
    difficulty: challenge.difficulty || 'easy',
    points: challenge.points || 100,
    expectedResult: JSON.stringify(challenge.expectedResult || [], null, 2),
    baselineQuery: JSON.stringify(challenge.baselineQuery || {}, null, 2),
    notes: (challenge.notes || []).join('\n'),
  };
  showForm.value = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<template>
  <div class="min-h-screen bg-[#0f1319] text-white flex flex-col font-sans">
    <header class="border-b border-[#1e2532] bg-[#13171e] py-4 px-8 flex justify-between items-center sticky top-0 z-10 shrink-0">
      <div class="flex items-center gap-4">
        <Shield class="w-6 h-6 text-[#00ed64]" />
        <h1 class="text-xl font-black tracking-tight text-white">Admin Console</h1>
      </div>
      
      <div class="flex items-center gap-6">
        <button @click="router.push('/challenges')" class="text-sm text-[#8a94a6] hover:text-white transition-colors">
          View Platform
        </button>
        <button 
          @click="handleLogout"
          class="flex items-center gap-2 text-sm text-[#8a94a6] hover:text-red-400 transition-colors"
        >
          <LogOut class="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>

    <main class="flex-grow p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-[#13171e] border border-[#1e2532] rounded-md p-6 flex items-center gap-4">
          <div class="p-3 bg-blue-500/10 rounded-sm">
            <Users class="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Total Users</p>
            <p class="text-2xl font-bold mt-1">{{ summary.users }}</p>
          </div>
        </div>
        
        <div class="bg-[#13171e] border border-[#1e2532] rounded-md p-6 flex items-center gap-4">
          <div class="p-3 bg-[#00ed64]/10 rounded-sm">
            <FileCode2 class="w-6 h-6 text-[#00ed64]" />
          </div>
          <div>
            <p class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Challenges</p>
            <p class="text-2xl font-bold mt-1">{{ summary.challenges }}</p>
          </div>
        </div>
        
        <div class="bg-[#13171e] border border-[#1e2532] rounded-md p-6 flex items-center gap-4">
          <div class="p-3 bg-purple-500/10 rounded-sm">
            <Activity class="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Submissions</p>
            <p class="text-2xl font-bold mt-1">{{ summary.submissions }}</p>
          </div>
        </div>
        
        <div class="bg-[#13171e] border border-[#1e2532] rounded-md p-6 flex items-center gap-4">
          <div class="p-3 bg-orange-500/10 rounded-sm">
            <Activity class="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Pending</p>
            <p class="text-2xl font-bold mt-1">{{ summary.pendingSubmissions }}</p>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center mt-8">
        <h2 class="text-2xl font-bold">Challenge Management</h2>
        <button 
          @click="showForm ? cancelForm() : (showForm = true)"
          class="bg-[#00ed64] hover:bg-[#00ed64]/90 text-black px-4 py-2 rounded-sm font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <Plus class="w-4 h-4" />
          {{ showForm ? 'Cancel' : 'New Challenge' }}
        </button>
      </div>

      <div v-if="showForm" class="bg-[#13171e] border border-[#1e2532] rounded-md p-6 relative">
        <h3 class="text-lg font-bold mb-6 text-white border-b border-[#1e2532] pb-4">{{ editingId ? 'Edit Challenge' : 'Create New Challenge' }}</h3>
        
        <form @submit.prevent="createChallenge" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Title</label>
            <input v-model="newChallenge.title" required type="text" class="w-full bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00ed64]" />
          </div>
          
          <div class="space-y-2">
            <label class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Dataset Collection</label>
            <input v-model="newChallenge.datasetCollection" required type="text" class="w-full bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00ed64]" />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Difficulty</label>
            <select v-model="newChallenge.difficulty" class="w-full bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00ed64]">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Points</label>
            <input v-model.number="newChallenge.points" required type="number" class="w-full bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00ed64]" />
          </div>

          <div class="space-y-2 md:col-span-2">
            <label class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Description (Markdown)</label>
            <textarea v-model="newChallenge.description" required rows="4" class="w-full bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00ed64] font-mono"></textarea>
          </div>

          <div class="space-y-2 md:col-span-2">
            <label class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Notes (One per line)</label>
            <textarea v-model="newChallenge.notes" rows="3" class="w-full bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00ed64] font-mono"></textarea>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Baseline Query (JSON)</label>
            <textarea v-model="newChallenge.baselineQuery" required rows="6" class="w-full bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00ed64] font-mono text-xs"></textarea>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-mono uppercase tracking-wider text-[#8a94a6]">Expected Result (JSON Array)</label>
            <textarea v-model="newChallenge.expectedResult" required rows="6" class="w-full bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00ed64] font-mono text-xs"></textarea>
          </div>

          <div class="md:col-span-2 flex justify-end mt-4">
            <button type="submit" class="bg-[#00ed64] hover:bg-[#00ed64]/90 text-black px-6 py-2 rounded-sm font-bold text-sm transition-colors">
              {{ editingId ? 'Update Challenge' : 'Save Challenge' }}
            </button>
          </div>
        </form>
      </div>

      <div class="bg-[#13171e] border border-[#1e2532] rounded-md overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="bg-[#0f1319] text-[#8a94a6] font-mono text-xs uppercase">
            <tr>
              <th class="px-6 py-4 font-medium">Status</th>
              <th class="px-6 py-4 font-medium">Title</th>
              <th class="px-6 py-4 font-medium">Difficulty</th>
              <th class="px-6 py-4 font-medium">Points</th>
              <th class="px-6 py-4 font-medium">Collection</th>
              <th class="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e2532]">
            <tr v-if="loading">
              <td colspan="6" class="px-6 py-8 text-center text-[#8a94a6]">Loading challenges...</td>
            </tr>
            <tr v-else-if="challenges.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-[#8a94a6]">No challenges found.</td>
            </tr>
            <tr v-for="challenge in challenges" :key="challenge._id" @click="editChallenge(challenge)" class="hover:bg-[#1e2532]/30 transition-colors cursor-pointer">
              <td class="px-6 py-4">
                <span v-if="challenge.active" class="px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold bg-[#00ed64]/10 text-[#00ed64] border border-[#00ed64]/20 flex w-fit items-center gap-1">
                  <Check class="w-3 h-3" /> Active
                </span>
                <span v-else class="px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold bg-[#ff5f56]/10 text-[#ff5f56] border border-[#ff5f56]/20 flex w-fit items-center gap-1">
                  <X class="w-3 h-3" /> Inactive
                </span>
              </td>
              <td class="px-6 py-4 font-bold text-white">{{ challenge.title }}</td>
              <td class="px-6 py-4">
                <span :class="[
                  'px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm border',
                  challenge.difficulty === 'easy' ? 'bg-[#00ed64]/10 text-[#00ed64] border-[#00ed64]/20' : 
                  challenge.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                  'bg-[#ff5f56]/10 text-[#ff5f56] border-[#ff5f56]/20'
                ]">
                  {{ challenge.difficulty }}
                </span>
              </td>
              <td class="px-6 py-4 font-mono">{{ challenge.points }}</td>
              <td class="px-6 py-4 font-mono text-[#8a94a6]">{{ challenge.datasetCollection }}</td>
              <td class="px-6 py-4 text-right">
                <button 
                  @click.stop="toggleChallengeStatus(challenge._id, challenge.active)"
                  class="text-xs font-mono text-[#8a94a6] hover:text-white transition-colors underline underline-offset-2"
                >
                  {{ challenge.active ? 'Deactivate' : 'Activate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-between items-center mt-12">
        <h2 class="text-2xl font-bold">User Management</h2>
      </div>

      <div class="bg-[#13171e] border border-[#1e2532] rounded-md overflow-hidden mb-12">
        <table class="w-full text-left text-sm">
          <thead class="bg-[#0f1319] text-[#8a94a6] font-mono text-xs uppercase">
            <tr>
              <th class="px-6 py-4 font-medium">Username</th>
              <th class="px-6 py-4 font-medium">Role</th>
              <th class="px-6 py-4 font-medium">Total Points</th>
              <th class="px-6 py-4 font-medium">Success Rate</th>
              <th class="px-6 py-4 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1e2532]">
            <tr v-if="loading">
              <td colspan="5" class="px-6 py-8 text-center text-[#8a94a6]">Loading users...</td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-[#8a94a6]">No users found.</td>
            </tr>
            <tr v-for="user in users" :key="user._id" class="hover:bg-[#1e2532]/30 transition-colors">
              <td class="px-6 py-4 font-bold text-white flex items-center gap-3">
                <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`" class="w-6 h-6 rounded bg-[#1e2532]" />
                {{ user.username }}
              </td>
              <td class="px-6 py-4">
                <span :class="[
                  'px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider border',
                  user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#1e2532] text-[#8a94a6] border-[#1e2532]'
                ]">
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4 font-mono text-[#00ed64]">{{ user.stats?.totalScore || 0 }}</td>
              <td class="px-6 py-4 font-mono text-[#8a94a6]">
                {{ user.stats?.evaluatedSubmissions > 0 
                    ? Math.round((user.stats.correctSubmissions / user.stats.evaluatedSubmissions) * 100) 
                    : 0 }}% 
                <span class="text-xs">({{ user.stats?.correctSubmissions || 0 }}/{{ user.stats?.evaluatedSubmissions || 0 }})</span>
              </td>
              <td class="px-6 py-4 text-[#8a94a6] text-xs">
                {{ new Date(user.createdAt).toLocaleDateString() }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </main>
  </div>
</template>
