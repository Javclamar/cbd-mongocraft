<script setup lang="ts">
import { ApiFetchError, apiFetch } from '@/lib/api'
import { parseMongoQuery, type QueryPayload } from '@/lib/interpreter'
import { ArrowLeft, CheckCircle2, Database, Loader2, Play, Trophy, X, XCircle } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Monaco editor
import VueMonacoEditor from '@guolao/vue-monaco-editor'

const route = useRoute()
const router = useRouter()
const challengeId = route.params.id as string

interface Challenge {
  _id: string
  title: string
  difficulty: string
  description: string
  notes?: string[]
  datasetCollection: string
  baselineQuery: {
    type: 'find' | 'aggregate' | string
  }
}

interface MongoQueryMetrics {
  executionTimeMillis: number | null
  totalDocsExamined: number | null
  totalKeysExamined: number | null
  nReturned: number | null
}

interface SubmissionMetricsPayload {
  submitted?: {
    executionTimeMillis?: number
    totalDocsExamined?: number
    totalKeysExamined?: number
    nReturned?: number
  }
  executionTimeMillis?: number
  totalDocsExamined?: number
  totalKeysExamined?: number
  nReturned?: number
}

interface ChallengeSchemaField {
  path: string
  types: string[]
}

interface ChallengeSchemaResponse {
  collection: string
  totalDocuments: number
  sampledDocuments: number
  fields: ChallengeSchemaField[]
}

interface SubmissionResponse {
  isCorrect: boolean
  score?: number
  maxPoints: number
  status?: string
  metrics?: SubmissionMetricsPayload
  resultSample?: unknown[]
}

interface ErrorDetails {
  category: 'network' | 'validation' | 'http' | 'unknown'
  statusCode: number | null
  message: string
  backendMessage: string | null
  validationErrors: string[]
}

interface ErrorPayloadShape {
  message?: string
  error?: string
  errors?: Array<{ message?: string } | string>
}

const isLoading = ref(true)
const isExecuting = ref(false)
const challenge = ref<Challenge | null>(null)

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

const errorDetails = ref<ErrorDetails | null>(null)
const data = ref<SubmissionResponse | null>(null)
const queryMetrics = ref<MongoQueryMetrics | null>(null)
const isSchemaModalOpen = ref(false)
const isSchemaLoading = ref(false)
const schemaError = ref<string | null>(null)
const challengeSchema = ref<ChallengeSchemaResponse | null>(null)

const FIELD_PRIORITY = [
  '_id',
  'id',
  'name',
  'title',
  'username',
  'email',
  'status',
  'type',
  'createdAt',
  'updatedAt',
]

const HIDDEN_FIELD_EXACT = new Set(['__v'])

function isRelevantSchemaField(fieldPath: string): boolean {
  if (!fieldPath || HIDDEN_FIELD_EXACT.has(fieldPath)) {
    return false
  }

  // Keep only top-level business fields and drop technical internals like _id.buffer.
  if (fieldPath.includes('.') || fieldPath.includes('[]')) {
    return false
  }

  if (fieldPath.startsWith('_') && fieldPath !== '_id') {
    return false
  }

  const lowered = fieldPath.toLowerCase()
  if (lowered.includes('buffer') || lowered.includes('position')) {
    return false
  }

  return true
}

const relevantSchemaFields = computed<ChallengeSchemaField[]>(() => {
  const fields = challengeSchema.value?.fields ?? []

  return fields
    .filter((field) => isRelevantSchemaField(field.path))
    .sort((a, b) => {
      const aPriority = FIELD_PRIORITY.indexOf(a.path)
      const bPriority = FIELD_PRIORITY.indexOf(b.path)

      if (aPriority !== -1 || bPriority !== -1) {
        if (aPriority === -1) return 1
        if (bPriority === -1) return -1
        return aPriority - bPriority
      }

      return a.path.localeCompare(b.path)
    })
})

function normalizeError(error: unknown): ErrorDetails {
  if (error instanceof ApiFetchError) {
    const payload = (error.payload ?? null) as ErrorPayloadShape | null
    const validationErrors = Array.isArray(payload?.errors)
      ? payload.errors
          .map((item) => {
            if (typeof item === 'string') return item
            return item?.message || ''
          })
          .filter(Boolean)
      : []

    return {
      category: error.kind,
      statusCode: error.statusCode,
      message: error.message,
      backendMessage: error.backendMessage,
      validationErrors,
    }
  }

  if (error instanceof TypeError) {
    return {
      category: 'network',
      statusCode: null,
      message: 'Unable to reach the server. Please check your connection and try again.',
      backendMessage: error.message,
      validationErrors: [],
    }
  }

  return {
    category: 'unknown',
    statusCode: null,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    backendMessage: null,
    validationErrors: [],
  }
}

function extractQueryMetrics(response: SubmissionResponse): MongoQueryMetrics | null {
  const submitted = response.metrics?.submitted
  const executionTimeMillis = submitted?.executionTimeMillis ?? response.metrics?.executionTimeMillis ?? null
  const totalDocsExamined = submitted?.totalDocsExamined ?? response.metrics?.totalDocsExamined ?? null
  const totalKeysExamined = submitted?.totalKeysExamined ?? response.metrics?.totalKeysExamined ?? null
  const nReturned = submitted?.nReturned ?? response.metrics?.nReturned ?? response.resultSample?.length ?? null

  if (
    executionTimeMillis === null &&
    totalDocsExamined === null &&
    totalKeysExamined === null &&
    nReturned === null
  ) {
    return null
  }

  return {
    executionTimeMillis,
    totalDocsExamined,
    totalKeysExamined,
    nReturned,
  }
}

function errorCategoryLabel(category: ErrorDetails['category']): string {
  if (category === 'network') return 'Network Error'
  if (category === 'validation') return 'Validation Error'
  if (category === 'http') return 'Request Error'
  return 'Unexpected Error'
}

async function fetchChallenge() {
  isLoading.value = true
  errorDetails.value = null
  challengeSchema.value = null
  schemaError.value = null
  isSchemaModalOpen.value = false
  try {
    const response = await apiFetch<Challenge>(`/challenges/${challengeId}`)
    challenge.value = response
    code.value = `// Challenge: ${response.title}\n// Dataset: db.${response.datasetCollection}\n\ndb.${response.datasetCollection}.${response.baselineQuery.type === 'find' ? 'find({\n  \n})' : 'aggregate([\n  \n])'}`
  } catch (error) {
    console.error(error)
    errorDetails.value = normalizeError(error)
  } finally {
    isLoading.value = false
  }
}

async function fetchChallengeSchema() {
  if (!challenge.value?._id) return

  isSchemaLoading.value = true
  schemaError.value = null

  try {
    const response = await apiFetch<ChallengeSchemaResponse>(`/challenges/${challenge.value._id}/schema`)
    challengeSchema.value = response
  } catch (error) {
    const normalized = normalizeError(error)
    schemaError.value = normalized.message
  } finally {
    isSchemaLoading.value = false
  }
}

async function openSchemaModal() {
  isSchemaModalOpen.value = true

  if (!challengeSchema.value && !isSchemaLoading.value) {
    await fetchChallengeSchema()
  }
}

function closeSchemaModal() {
  isSchemaModalOpen.value = false
}

onMounted(() => {
  fetchChallenge()
})

async function runCode() {
  if (!code.value.trim()) return
  if (!challenge.value?._id) return

  isExecuting.value = true
  errorDetails.value = null
  data.value = null
  queryMetrics.value = null

  try {
    const queryPayload: QueryPayload = parseMongoQuery(code.value)

    const response = await apiFetch<SubmissionResponse>('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        challengeId: challenge.value._id,
        query: queryPayload
      })
    })

    data.value = response
    queryMetrics.value = extractQueryMetrics(response)
  } catch (error) {
    errorDetails.value = normalizeError(error)
  } finally {
    isExecuting.value = false
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
      
      <div class="flex items-center gap-2">
        <button
          @click="openSchemaModal"
          :disabled="isLoading"
          class="flex items-center gap-2 px-4 py-2 rounded-sm font-mono font-bold text-xs border border-[#2b3547] text-[#c6ceda] hover:text-white hover:border-[#3a475f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database class="w-4 h-4" />
          View Schema
        </button>

        <button
          @click="runCode"
          :disabled="isExecuting || isLoading"
          class="flex items-center gap-2 bg-[#00ed64] hover:bg-[#00ed64]/90 text-black px-5 py-2 rounded-sm font-mono font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Loader2 v-if="isExecuting" class="w-4 h-4 animate-spin" />
          <Play v-else class="w-4 h-4 fill-black" />
          Run Code
        </button>
      </div>
    </header>

    <div v-if="isLoading" class="flex-grow flex items-center justify-center">
      <Loader2 class="w-8 h-8 text-[#00ed64] animate-spin" />
    </div>

    <div v-else-if="challenge" class="flex-grow flex overflow-hidden">
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
            
            <div v-if="!data && !errorDetails" class="text-[#8a94a6] flex items-center justify-center h-full opacity-50">
              Run your code to see the results here.
            </div>

            <div v-if="errorDetails" class="text-[#ef4444] bg-[#ef4444]/10 p-4 rounded-sm border border-[#ef4444]/20 flex gap-3">
              <XCircle class="w-5 h-5 shrink-0" />
              <div>
                <p class="font-bold mb-2">{{ errorCategoryLabel(errorDetails.category) }}</p>
                <div class="space-y-1 text-xs">
                  <p>
                    <span class="text-white/70">Message:</span>
                    {{ errorDetails.message }}
                  </p>
                  <p>
                    <span class="text-white/70">HTTP Status:</span>
                    {{ errorDetails.statusCode ?? 'N/A' }}
                  </p>
                  <p v-if="errorDetails.backendMessage">
                    <span class="text-white/70">Backend:</span>
                    {{ errorDetails.backendMessage }}
                  </p>
                </div>

                <ul
                  v-if="errorDetails.validationErrors.length > 0"
                  class="list-disc list-inside mt-2 text-xs text-[#fecaca] space-y-1"
                >
                  <li v-for="(validationError, index) in errorDetails.validationErrors" :key="index">
                    {{ validationError }}
                  </li>
                </ul>
              </div>
            </div>

            <div v-if="data" class="space-y-4">
              <div 
                :class="[
                  'p-4 rounded-sm border flex items-center gap-3',
                  data.isCorrect ? 'bg-[#00ed64]/10 border-[#00ed64]/30 text-[#00ed64]' : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
                ]"
              >
                <CheckCircle2 v-if="data.isCorrect" class="w-6 h-6" />
                <XCircle v-else class="w-6 h-6" />
                <div>
                  <p class="font-bold text-lg">
                    {{ data.isCorrect ? 'Accepted!' : 'Wrong Answer' }}
                  </p>
                  <p class="text-xs text-white/70">
                    Score: {{ data.score || 0 }} / {{ data.maxPoints }}
                  </p>
                </div>
                
                <div v-if="data.isCorrect" class="ml-auto flex items-center gap-2">
                   <Trophy class="w-5 h-5 text-yellow-400" />
                   <span class="font-bold text-yellow-400">+{{ data.score || 0 }} pts</span>
                </div>
              </div>

              <div v-if="queryMetrics" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div class="p-3 bg-[#0f1319] border border-[#1e2532] rounded-sm">
                  <p class="text-[10px] uppercase text-[#8a94a6] mb-1">Execution Time</p>
                  <p class="text-white">{{ queryMetrics.executionTimeMillis ?? 'N/A' }}<span v-if="queryMetrics.executionTimeMillis !== null">ms</span></p>
                </div>
                <div class="p-3 bg-[#0f1319] border border-[#1e2532] rounded-sm">
                  <p class="text-[10px] uppercase text-[#8a94a6] mb-1">Docs Examined</p>
                  <p class="text-white">{{ queryMetrics.totalDocsExamined ?? 'N/A' }}</p>
                </div>
                <div class="p-3 bg-[#0f1319] border border-[#1e2532] rounded-sm">
                  <p class="text-[10px] uppercase text-[#8a94a6] mb-1">Keys Examined</p>
                  <p class="text-white">{{ queryMetrics.totalKeysExamined ?? 'N/A' }}</p>
                </div>
                <div class="p-3 bg-[#0f1319] border border-[#1e2532] rounded-sm">
                  <p class="text-[10px] uppercase text-[#8a94a6] mb-1">Returned Docs</p>
                  <p class="text-white">{{ queryMetrics.nReturned ?? 'N/A' }}</p>
                </div>
              </div>
              
              <div v-if="data.resultSample && data.resultSample.length > 0">
                 <p class="text-[10px] uppercase text-[#8a94a6] mb-2 mt-4">Result Sample</p>
                 <pre class="bg-[#0f1319] p-4 rounded-sm border border-[#1e2532] overflow-x-auto text-xs text-[#e5e7eb]">{{ JSON.stringify(data.resultSample, null, 2) }}</pre>
              </div>
              <div v-else-if="data.status === 'evaluated'">
                 <p class="text-[10px] uppercase text-[#8a94a6] mb-2 mt-4">Result Sample</p>
                 <p class="text-[#8a94a6] text-xs italic">No documents matched your query.</p>
              </div>
              
            </div>

          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-grow flex items-center justify-center px-6 text-center">
      <div>
        <p class="text-white font-semibold mb-2">Unable to load challenge</p>
        <p class="text-sm text-[#8a94a6]">Check the error details in the console panel and try again.</p>
      </div>
    </div>

    <div
      v-if="isSchemaModalOpen"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-4"
      @click.self="closeSchemaModal"
    >
      <div class="w-full max-w-4xl max-h-[85vh] bg-[#13171e] border border-[#283141] rounded-sm overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div class="px-5 py-4 border-b border-[#1e2532] flex items-center justify-between bg-gradient-to-r from-[#0f1319] via-[#141b24] to-[#0f1319]">
          <div>
            <h2 class="text-sm font-mono uppercase tracking-wide text-[#d2d9e4]">Collection Schema</h2>
            <p class="text-xs text-[#8a94a6] mt-1">
              {{ challengeSchema?.collection ? `db.${challengeSchema.collection}` : 'Loading schema...' }}
            </p>
          </div>
          <button
            @click="closeSchemaModal"
            class="text-[#8a94a6] hover:text-white transition-colors"
            aria-label="Close schema modal"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div v-if="isSchemaLoading" class="h-40 flex items-center justify-center text-[#8a94a6]">
            <Loader2 class="w-6 h-6 animate-spin text-[#00ed64]" />
          </div>

          <div v-else-if="schemaError" class="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fecaca] rounded-sm p-4 text-sm">
            {{ schemaError }}
          </div>

          <div v-else-if="challengeSchema" class="space-y-5">
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="px-2.5 py-1 rounded-full border border-[#2c3546] bg-[#0f1319] text-[#9fb0c8]">
                Analizados: {{ challengeSchema.sampledDocuments }} de {{ challengeSchema.totalDocuments }} docs
              </span>
              <span class="px-2.5 py-1 rounded-full border border-[#14543a] bg-[#00ed64]/10 text-[#6effad]">
                Showing important fields only
              </span>
            </div>

            <div
              v-if="relevantSchemaFields.length > 0"
              class="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              <div
                v-for="field in relevantSchemaFields"
                :key="field.path"
                class="p-3 rounded-sm border border-[#243043] bg-[#0f1319] hover:border-[#32425d] transition-colors"
              >
                <p class="text-[11px] uppercase tracking-wider text-[#7f90a7] mb-2">Field</p>
                <p class="text-sm text-[#e3e8f1] font-mono break-all">{{ field.path }}</p>

                <div class="mt-3 flex flex-wrap gap-1.5">
                  <span
                    v-for="fieldType in field.types"
                    :key="`${field.path}-${fieldType}`"
                    class="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#14543a] bg-[#00ed64]/10 text-[#6effad]"
                  >
                    {{ fieldType }}
                  </span>
                </div>
              </div>
            </div>

            <p v-else class="text-sm text-[#8a94a6] italic">
              No important fields were detected for this collection sample.
            </p>
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
