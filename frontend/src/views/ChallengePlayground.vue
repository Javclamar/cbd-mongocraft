<script setup lang="ts">
import { apiFetch } from '@/lib/api'
import { parseMongoQuery, type QueryPayload } from '@/lib/interpreter'
import { ArrowLeft, CheckCircle2, Loader2, Play, Trophy, XCircle } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Monaco editor
import VueMonacoEditor from '@guolao/vue-monaco-editor'

const route = useRoute()
const router = useRouter()
const challengeId = route.params.id as string

const loading = ref(true)
const executing = ref(false)
const challenge = ref<any>(null)
const showComparison = ref(false)

const code = ref(`// Write your query here\n// Example:\n// db.collection.find({})\n`)

const MONACO_EDITOR_OPTIONS = {
  automaticLayout: true,
  formatOnType: true,
  formatOnPaste: true,
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  padding: { top: 16, bottom: 16 },
  lineNumbersMinChars: 3,
}

const errorMsg = ref<string | null>(null)
const executionResult = ref<any>(null)

async function fetchChallenge() {
  loading.value = true
  try {
    const data = await apiFetch<any>(`/challenges/${challengeId}`)
    challenge.value = data
    code.value = `// Challenge: ${data.title}\n// Dataset: db.${data.datasetCollection}\n\ndb.${data.datasetCollection}.${data.baselineQuery.type === 'find' ? 'find({\n  \n})' : 'aggregate([\n  \n])'}`
  } catch (err) {
    console.error(err)
    errorMsg.value = 'Failed to load challenge.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchChallenge()
})

async function runCode() {
  if (!code.value.trim()) return

  executing.value = true
  errorMsg.value = null
  executionResult.value = null
  showComparison.value = false

  try {
    const queryPayload: QueryPayload = parseMongoQuery(code.value)

    const response = await apiFetch<any>('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        challengeId: challenge.value._id,
        query: queryPayload
      })
    })

    executionResult.value = response
  } catch (err: any) {
    errorMsg.value = err.message || 'An error occurred during execution'
  } finally {
    executing.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen bg-[#0f1319] text-white overflow-hidden">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-[#1e2532] bg-[#13171e] shrink-0">
      <div class="flex items-center gap-4">
        <button @click="router.back()" class="text-[#8a94a6] hover:text-white transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div v-if="challenge" class="flex items-center gap-3">
          <h1 class="text-lg font-bold">{{ challenge.title }}</h1>
          <span class="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm bg-[#00ed64]/10 text-[#00ed64] border border-[#00ed64]/20">
            {{ challenge.difficulty }}
          </span>
        </div>
        <div v-else class="h-6 w-32 bg-[#1e2532] animate-pulse rounded-sm"></div>
      </div>
      
      <button 
        @click="runCode" 
        :disabled="executing || loading"
        class="flex items-center gap-2 bg-[#00ed64] hover:bg-[#00ed64]/90 text-black px-5 py-2 rounded-sm font-mono font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Loader2 v-if="executing" class="w-4 h-4 animate-spin" />
        <Play v-else class="w-4 h-4 fill-black" />
        Run Code
      </button>
    </header>

    <div v-if="loading" class="flex-grow flex items-center justify-center">
      <Loader2 class="w-8 h-8 text-[#00ed64] animate-spin" />
    </div>

    <div v-else class="flex-grow flex overflow-hidden">
      <div class="w-1/3 border-r border-[#1e2532] bg-[#0f1319] flex flex-col overflow-y-auto custom-scrollbar">
        <div class="p-6">
          <h2 class="text-xs font-mono uppercase tracking-wider text-[#8a94a6] mb-4">Instructions</h2>
          <div class="prose prose-invert prose-sm max-w-none font-sans text-gray-300 leading-relaxed whitespace-pre-wrap">
            {{ challenge.description }}
          </div>
          
          <div v-if="challenge.notes && challenge.notes.length > 0" class="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-sm">
            <h3 class="text-[10px] font-mono uppercase tracking-wider text-blue-400 mb-2">Notes</h3>
            <ul class="list-disc list-inside text-sm font-sans text-gray-300 space-y-1">
              <li v-for="(note, index) in challenge.notes" :key="index">{{ note }}</li>
            </ul>
          </div>
          
          <div class="mt-8 p-4 bg-[#13171e] border border-[#1e2532] rounded-sm">
            <h3 class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6] mb-2">Target Collection</h3>
            <code class="text-sm font-mono text-[#00ed64]">db.{{ challenge.datasetCollection }}</code>
          </div>
        </div>
      </div>

      <div class="flex-grow flex flex-col w-2/3">
        <div class="flex-grow relative border-b border-[#1e2532]">
          <vue-monaco-editor
            v-model:value="code"
            theme="vs-dark"
            language="javascript"
            :options="MONACO_EDITOR_OPTIONS"
            class="absolute inset-0"
          />
        </div>

        <div class="h-1/3 bg-[#13171e] flex flex-col shrink-0">
          <div class="px-4 py-2 border-b border-[#1e2532] flex items-center justify-between bg-[#0f1319]">
            <span class="text-[10px] font-mono uppercase tracking-wider text-[#8a94a6]">Console Output</span>
          </div>
          
          <div class="flex-grow p-4 overflow-y-auto font-mono text-sm custom-scrollbar relative">
            
            <div v-if="!executionResult && !errorMsg" class="text-[#8a94a6] flex items-center justify-center h-full opacity-50">
              Run your code to see the results here.
            </div>

            <div v-if="errorMsg" class="text-[#ef4444] bg-[#ef4444]/10 p-4 rounded-sm border border-[#ef4444]/20 flex gap-3">
              <XCircle class="w-5 h-5 shrink-0" />
              <div>
                <p class="font-bold mb-1">Execution Error</p>
                <p class="text-xs whitespace-pre-wrap">{{ errorMsg }}</p>
              </div>
            </div>

            <div v-if="executionResult" class="space-y-4">
              <div 
                :class="[
                  'p-4 rounded-sm border flex items-center gap-3',
                  executionResult.isCorrect ? 'bg-[#00ed64]/10 border-[#00ed64]/30 text-[#00ed64]' : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
                ]"
              >
                <CheckCircle2 v-if="executionResult.isCorrect" class="w-6 h-6" />
                <XCircle v-else class="w-6 h-6" />
                <div>
                  <p class="font-bold text-lg">
                    {{ executionResult.isCorrect ? 'Accepted!' : 'Wrong Answer' }}
                  </p>
                  <p class="text-xs text-white/70">
                    Score: {{ executionResult.score || 0 }} / {{ executionResult.maxPoints }}
                  </p>
                </div>
                
                <div v-if="executionResult.isCorrect" class="ml-auto flex items-center gap-2">
                   <Trophy class="w-5 h-5 text-yellow-400" />
                   <span class="font-bold text-yellow-400">+{{ executionResult.score }} pts</span>
                </div>
              </div>

              <div v-if="executionResult.metrics" class="grid grid-cols-3 gap-4">
                <div class="p-3 bg-[#0f1319] border border-[#1e2532] rounded-sm">
                  <p class="text-[10px] uppercase text-[#8a94a6] mb-1">Execution Time</p>
                  <p class="text-white">{{ executionResult.metrics.submitted?.executionTimeMillis }}ms</p>
                </div>
                <div class="p-3 bg-[#0f1319] border border-[#1e2532] rounded-sm">
                  <p class="text-[10px] uppercase text-[#8a94a6] mb-1">Docs Examined</p>
                  <p class="text-white">{{ executionResult.metrics.submitted?.totalDocsExamined }}</p>
                </div>
                <div class="p-3 bg-[#0f1319] border border-[#1e2532] rounded-sm">
                  <p class="text-[10px] uppercase text-[#8a94a6] mb-1">Keys Examined</p>
                  <p class="text-white">{{ executionResult.metrics.submitted?.totalKeysExamined }}</p>
                </div>
              </div>
              
              <div v-if="!executionResult.isCorrect && executionResult.status === 'evaluated'" class="mt-6">
                <div class="flex items-center justify-between mb-4">
                  <p class="text-[10px] uppercase text-[#8a94a6]">Output Comparison</p>
                  <button 
                    @click="showComparison = !showComparison" 
                    class="text-xs font-mono text-[#8a94a6] hover:text-white transition-colors underline underline-offset-2"
                  >
                    {{ showComparison ? 'Hide Expected Output' : 'Reveal Expected Output' }}
                  </button>
                </div>
                
                <div v-if="showComparison" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div class="flex flex-col">
                    <div class="px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 border-b-0 rounded-t-sm inline-block w-fit">
                      <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ef4444]">Your Output</span>
                    </div>
                    <pre class="flex-grow bg-[#0f1319] p-4 rounded-sm rounded-tl-none border border-[#ef4444]/30 overflow-x-auto text-xs text-[#e5e7eb] custom-scrollbar">{{ executionResult.resultSample?.length ? JSON.stringify(executionResult.resultSample, null, 2) : '[]\n// No documents matched your query.' }}</pre>
                  </div>
                  <div class="flex flex-col">
                    <div class="px-3 py-1.5 bg-[#00ed64]/10 border border-[#00ed64]/20 border-b-0 rounded-t-sm inline-block w-fit">
                      <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00ed64]">Expected Output</span>
                    </div>
                    <pre class="flex-grow bg-[#0f1319] p-4 rounded-sm rounded-tl-none border border-[#00ed64]/30 overflow-x-auto text-xs text-[#e5e7eb] custom-scrollbar">{{ JSON.stringify(challenge.expectedResult, null, 2) }}</pre>
                  </div>
                </div>
                <div v-else class="flex flex-col">
                   <div class="px-3 py-1.5 bg-[#1e2532]/50 border border-[#1e2532] border-b-0 rounded-t-sm inline-block w-fit">
                      <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8a94a6]">Your Output</span>
                   </div>
                   <pre class="flex-grow bg-[#0f1319] p-4 rounded-sm rounded-tl-none border border-[#1e2532] overflow-x-auto text-xs text-[#e5e7eb] custom-scrollbar">{{ executionResult.resultSample?.length ? JSON.stringify(executionResult.resultSample, null, 2) : '[]\n// No documents matched your query.' }}</pre>
                </div>
              </div>
              <div v-else-if="executionResult.resultSample && executionResult.resultSample.length > 0">
                 <p class="text-[10px] uppercase text-[#8a94a6] mb-2 mt-4">Result Sample</p>
                 <pre class="bg-[#0f1319] p-4 rounded-sm border border-[#1e2532] overflow-x-auto text-xs text-[#e5e7eb] custom-scrollbar">{{ JSON.stringify(executionResult.resultSample, null, 2) }}</pre>
              </div>
              <div v-else-if="executionResult.status === 'evaluated'">
                 <p class="text-[10px] uppercase text-[#8a94a6] mb-2 mt-4">Result Sample</p>
                 <p class="text-[#8a94a6] text-xs italic">No documents matched your query.</p>
              </div>
              
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1e2532;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #2d3748;
}
</style>
