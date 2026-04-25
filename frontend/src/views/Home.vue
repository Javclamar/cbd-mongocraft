<script setup lang="ts">
import { ArrowRight, Loader2, AlertCircle } from 'lucide-vue-next';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi, authState } from '@/services/auth.service';

const router = useRouter();
const username = ref('');
const password = ref('');
const isRegister = ref(false);
const loading = ref(false);
const error = ref('');

const handleAuth = async () => {
  if (!username.value || !password.value) {
    error.value = 'Please enter both username and password';
    return;
  }

  error.value = '';
  loading.value = true;

  try {
    if (isRegister.value) {
      await authApi.register(username.value, password.value);
    } else {
      await authApi.login(username.value, password.value);
    }
    router.push('/challenges');
  } catch (err: any) {
    error.value = err.message || 'Authentication failed';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex-grow grid grid-cols-1 lg:grid-cols-2 bg-[#0f1319]">
    <div class="bg-[#0f1319] border-r border-[#1e2532] px-8 py-16 flex flex-col justify-center">
      <div class="max-w-xl mx-auto lg:ml-auto lg:mr-16 w-full">
        
        <h1 class="text-6xl md:text-[5.5rem] font-black tracking-tighter text-white mb-0 leading-[1.05]">
          Master the
        </h1>
        <h1 class="text-6xl md:text-[5.5rem] font-black tracking-tighter text-[#00ed64] mb-0 leading-[1.05]">
          Document
        </h1>
        <h1 class="text-6xl md:text-[5.5rem] font-black tracking-tighter text-[#00ed64] mb-8 leading-[1.05]">
          Model.
        </h1>
        
        <p class="text-lg text-[#8a94a6] leading-relaxed mb-10 max-w-md">
        Step into the MongoCraft sandbox, run your queries, test your skills, and optimize your performance.
        </p>
                
        <div v-if="authState.isAuthenticated" class="flex flex-wrap items-center gap-4 mb-20">
          <RouterLink 
            to="/challenges"
            class="bg-[#00ed64] hover:bg-[#00ed64]/90 text-black font-bold text-sm px-6 py-3.5 rounded-sm flex items-center transition-colors"
          >
            Go to Challenges
            <ArrowRight class="ml-2 w-4 h-4" />
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="bg-[#13171e] px-8 py-16 flex flex-col justify-center">
      <div class="max-w-md mx-auto lg:mr-auto lg:ml-16 w-full">
        <div v-if="!authState.isAuthenticated" class="bg-[#1a202a] border border-[#1e2532] rounded-md p-8 shadow-2xl relative">
          <div class="flex items-start justify-between mb-8">
            <h2 class="text-2xl font-bold text-white tracking-tight">
              {{ isRegister ? 'Create Account' : 'Access Secure Shell' }}
            </h2>
          </div>

          <form @submit.prevent="handleAuth" class="space-y-6">
            <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-sm p-3 flex items-center gap-3 text-red-500 text-xs font-mono">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{{ error }}</span>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6]">
                Username
              </label>
              <input 
                v-model="username"
                type="text" 
                placeholder="admin" 
                class="w-full h-11 bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 text-sm text-white placeholder:text-[#8a94a6]/50 focus:outline-none focus:border-[#00ed64] font-mono transition-colors"
                :disabled="loading"
              />
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6]">
                Authorization Key
              </label>
              <input 
                v-model="password"
                type="password" 
                placeholder="••••••••••••" 
                class="w-full h-11 bg-[#0f1319] border border-[#1e2532] rounded-sm px-4 text-sm text-white placeholder:text-[#8a94a6]/50 focus:outline-none focus:border-[#00ed64] font-mono transition-colors"
                :disabled="loading"
              />
            </div>

            <div class="flex flex-col gap-4">
              <button 
                type="submit"
                class="w-full h-11 bg-[#00ed64] hover:bg-[#00ed64]/90 text-black font-bold text-sm rounded-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="loading"
              >
                <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
                <ArrowRight v-else class="w-4 h-4" />
                {{ isRegister ? 'Register' : 'Establish Connection' }}
              </button>

              <button 
                type="button"
                @click="isRegister = !isRegister; error = ''"
                class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6] hover:text-[#00ed64] transition-colors"
              >
                {{ isRegister ? 'Already have an account? Login' : 'Don\'t have an account? Register' }}
              </button>
            </div>
          </form>

          <div class="mt-8 bg-[#0f1319] border border-[#1e2532] rounded-sm p-4 font-mono text-[11px] leading-relaxed relative overflow-hidden">
             <div class="flex items-center gap-2 mb-3">
               <div class="flex gap-1.5">
                 <div class="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                 <div class="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                 <div class="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
               </div>
               <span class="text-[#8a94a6] ml-2">auth_script.js</span>
             </div>
             
             <div class="text-[#8a94a6]">
               <span class="text-[#ff7b72]">const</span> client = <span class="text-[#79c0ff]">await</span> MongoClient.<span class="text-[#d2a8ff]">connect</span>(URI);<br/>
               <span class="text-[#ff7b72]">const</span> db = client.<span class="text-[#d2a8ff]">db</span>(<span class="text-[#a5d6ff]">'academy'</span>);<br/>
               <span class="text-[#ff7b72]">return</span> <span class="text-[#79c0ff]">true</span>; <span class="text-[#8a94a6] opacity-50">// Connection Established</span>
             </div>
          </div>
        </div>

        <div v-else class="bg-[#1a202a] border border-[#1e2532] rounded-md p-8 shadow-2xl relative text-center">
          <h2 class="text-2xl font-bold text-white tracking-tight mb-4">
            Connection Active
          </h2>
          <p class="text-[#8a94a6] mb-8">
            You are currently logged in as <span class="text-[#00ed64] font-mono">{{ authState.user?.username }}</span>.
          </p>
          <RouterLink 
            to="/challenges"
            class="w-full h-11 bg-[#00ed64] hover:bg-[#00ed64]/90 text-black font-bold text-sm rounded-sm flex items-center justify-center gap-2 transition-colors"
          >
            Return to Sandbox
            <ArrowRight class="w-4 h-4" />
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

