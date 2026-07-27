<script setup>
/**
 * SeguimientoProyectos.vue
 * -----------------------------------------------------------------------------
 * Módulo de Seguimiento y Control de Proyectos.
 *
 * Se integra con el dashboard existente: NO recrea la vista de categorías,
 * solo recibe la categoría activa por prop (o param de ruta) y muestra los
 * proyectos correspondientes.
 *
 * Uso desde el padre:
 *   <SeguimientoProyectos category-name="Cotizador EPC" />
 *   <SeguimientoProyectos :category-name="$route.params.categoryName" />
 * -----------------------------------------------------------------------------
 */
import { ref, computed, watch } from 'vue'
import {
  MOCK_PROJECTS,
  STATUS_LIST,
  ALARM_LEVEL_LIST,
} from './data/mockData.js'
import ProjectCard from './components/ProjectCard.vue'
import AlarmsPanel from './components/AlarmsPanel.vue'
import ProjectDetailDrawer from './components/ProjectDetailDrawer.vue'
import NewProjectModal from './components/NewProjectModal.vue'
import StatTile from './components/StatTile.vue'

const props = defineProps({
  categoryName: { type: String, default: 'Cotizador EPC' },
  categoryId: { type: [String, Number], default: null },
})

// El padre puede escuchar acciones si quiere persistir en backend.
const emit = defineEmits(['project-created', 'project-updated', 'project-deleted', 'back'])

// --- Persistencia local (guardado automático en localStorage) ---
// Reemplaza esto por tu API / store Pinia cuando conectes el backend.
const STORAGE_KEY = 'seguimiento:projects:v1'

function loadProjects() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.warn('No se pudo leer el almacenamiento local:', e)
  }
  return structuredClone(MOCK_PROJECTS)
}

const projects = ref(loadProjects())
const savedAt = ref(null) // marca de tiempo del último guardado

// Guarda automáticamente ante cualquier cambio profundo en los proyectos.
watch(
  projects,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      savedAt.value = new Date()
    } catch (e) {
      console.warn('No se pudo guardar en el almacenamiento local:', e)
    }
  },
  { deep: true },
)

const savedLabel = computed(() => {
  if (!savedAt.value) return 'Guardado automático activo'
  return 'Guardado ' + savedAt.value.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
})

const search = ref('')
const statusFilter = ref('all')
const alarmFilter = ref('all')

const selectedProject = ref(null)
const drawerOpen = ref(false)
const modalOpen = ref(false)

// Confirmación de borrado
const pendingDelete = ref(null) // proyecto pendiente de eliminar

// --- Proyectos de la categoría activa ---
const categoryProjects = computed(() =>
  projects.value.filter((p) => p.category === props.categoryName),
)

// --- Filtrado (búsqueda + estado + alarma) ---
const filteredProjects = computed(() => {
  const term = search.value.trim().toLowerCase()
  return categoryProjects.value.filter((p) => {
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.client.toLowerCase().includes(term) ||
      p.location.toLowerCase().includes(term)
    const matchesStatus = statusFilter.value === 'all' || p.status === statusFilter.value
    const matchesAlarm = alarmFilter.value === 'all' || p.alarmLevel === alarmFilter.value
    return matchesSearch && matchesStatus && matchesAlarm
  })
})

const hasActiveFilters = computed(
  () => !!search.value || statusFilter.value !== 'all' || alarmFilter.value !== 'all',
)

// --- Métricas del encabezado ---
const stats = computed(() => {
  const list = categoryProjects.value
  return {
    total: list.length,
    ejecucion: list.filter((p) => p.status === 'ejecucion').length,
    completado: list.filter((p) => p.status === 'completado').length,
    alarmas: list.reduce(
      (acc, p) => acc + (p.alarms?.filter((a) => !a.resolved).length ?? 0),
      0,
    ),
  }
})

// Recalcula el nivel de alarma agregado de un proyecto.
function recomputeAlarmLevel(project) {
  const active = project.alarms.filter((a) => !a.resolved)
  if (active.some((a) => a.level === 'roja')) project.alarmLevel = 'roja'
  else if (active.some((a) => a.level === 'amarilla')) project.alarmLevel = 'amarilla'
  else project.alarmLevel = 'none'
}

function findProject(id) {
  return projects.value.find((p) => p.id === id)
}

// --- Handlers ---
function openDetail(project) {
  selectedProject.value = project
  drawerOpen.value = true
}

function updateStatus({ projectId, status }) {
  const p = findProject(projectId)
  if (p) {
    p.status = status
    if (status === 'completado') p.progress = 100
    emit('project-updated', p)
  }
}

function addPhoto({ projectId, photo }) {
  findProject(projectId)?.photos.push(photo)
}

function removePhoto({ projectId, photoId }) {
  const p = findProject(projectId)
  if (p) p.photos = p.photos.filter((ph) => ph.id !== photoId)
}

function updatePhoto({ projectId, photoId, url }) {
  const p = findProject(projectId)
  const photo = p?.photos.find((ph) => ph.id === photoId)
  if (photo) photo.url = url
}

function resolveAlarm({ projectId, alarmId }) {
  const p = findProject(projectId)
  const alarm = p?.alarms.find((a) => a.id === alarmId)
  if (alarm) {
    alarm.resolved = true
    recomputeAlarmLevel(p)
  }
}

function registerAlarm({ projectId, alarm }) {
  const p = findProject(projectId)
  if (p) {
    p.alarms.unshift(alarm)
    recomputeAlarmLevel(p)
  }
}

function createProject(project) {
  projects.value.push(project)
  modalOpen.value = false
  emit('project-created', project)
}

// --- Eliminar proyecto (con confirmación) ---
function requestDelete(project) {
  pendingDelete.value = project
}

function confirmDelete() {
  const id = pendingDelete.value?.id
  if (id != null) {
    projects.value = projects.value.filter((p) => p.id !== id)
    if (selectedProject.value?.id === id) drawerOpen.value = false
    emit('project-deleted', id)
  }
  pendingDelete.value = null
}

function cancelDelete() {
  pendingDelete.value = null
}

// --- Restablecer a los datos de ejemplo ---
function resetData() {
  projects.value = structuredClone(MOCK_PROJECTS)
}

function resetFilters() {
  search.value = ''
  statusFilter.value = 'all'
  alarmFilter.value = 'all'
}
</script>

<template>
  <section class="min-h-screen bg-navy-50 bg-grid-light bg-grid pb-16">
    <!-- ===== Cabecera "sala de control" (banda navy) ===== -->
    <header class="relative overflow-hidden bg-control">
      <span class="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-solar-400/10 blur-3xl" />
      <span class="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      <!-- Línea de barrido dorada superior -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <span class="block h-px w-1/4 animate-sheen bg-solar-sheen" />
      </div>

      <div class="relative mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <!-- Barra superior: volver + autosave -->
        <div class="flex items-center justify-between">
          <button
            class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-navy-200 transition-colors hover:text-white"
            @click="emit('back')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5m0 0 6 6m-6-6 6-6" />
            </svg>
            Volver
          </button>
          <p class="flex items-center gap-1.5 font-mono text-[11px] text-emerald-300">
            <span class="relative flex h-1.5 w-1.5">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {{ savedLabel }}
          </p>
        </div>

        <!-- Título + acciones -->
        <div class="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-solar-400/15 text-solar-300 ring-1 ring-solar-400/25">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              </span>
              <p class="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-solar-300">
                Seguimiento y control
              </p>
            </div>
            <h1 class="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {{ categoryName }}
            </h1>
            <p class="mt-1 text-sm text-navy-200">
              Estado en vivo de proyectos, evidencias y alarmas de la categoría.
            </p>
          </div>

          <div class="flex flex-none items-center gap-2">
            <button
              class="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-200 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
              title="Restablecer a los datos de ejemplo"
              @click="resetData"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />
              </svg>
              <span class="hidden sm:inline">Restablecer</span>
            </button>
            <button
              class="inline-flex items-center gap-2 rounded-xl bg-solar-400 px-4 py-2.5 text-sm font-semibold text-navy-900 shadow-solar transition-all hover:bg-solar-300 active:scale-[0.98]"
              @click="modalOpen = true"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <path d="M12 5v14m-7-7h14" />
              </svg>
              Nuevo proyecto
            </button>
          </div>
        </div>

        <!-- Lecturas KPI tipo instrumento -->
        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile :value="stats.total" label="Proyectos" accent="text-white" />
          <StatTile :value="stats.ejecucion" label="En operación" accent="text-sky-300" />
          <StatTile :value="stats.completado" label="Completados" accent="text-emerald-300" />
          <StatTile :value="stats.alarmas" label="Alarmas activas" accent="text-rose-300" :glow="stats.alarmas > 0" />
        </div>
      </div>
    </header>

    <!-- ===== Cuerpo ===== -->
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Columna listado -->
        <div class="lg:col-span-2">
          <!-- Barra de búsqueda y filtros -->
          <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="relative flex-1">
              <svg
                class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                v-model="search"
                type="text"
                placeholder="Buscar por nombre, cliente o ubicación…"
                class="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-3 text-sm text-navy-700 shadow-card ring-1 ring-navy-900/5 transition-shadow placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-solar-400"
              />
            </div>

            <div class="flex gap-2">
              <select
                v-model="statusFilter"
                class="rounded-xl border-0 bg-white py-2.5 pl-3 pr-8 text-sm text-navy-600 shadow-card ring-1 ring-navy-900/5 focus:outline-none focus:ring-2 focus:ring-solar-400"
              >
                <option value="all">Todos los estados</option>
                <option v-for="s in STATUS_LIST" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>

              <select
                v-model="alarmFilter"
                class="rounded-xl border-0 bg-white py-2.5 pl-3 pr-8 text-sm text-navy-600 shadow-card ring-1 ring-navy-900/5 focus:outline-none focus:ring-2 focus:ring-solar-400"
              >
                <option value="all">Toda alarma</option>
                <option v-for="a in ALARM_LEVEL_LIST" :key="a.key" :value="a.key">{{ a.label }}</option>
              </select>
            </div>
          </div>

          <!-- Resultado + limpiar -->
          <div v-if="hasActiveFilters" class="mb-3 flex items-center justify-between px-1">
            <p class="font-mono text-[11px] text-navy-400">
              {{ filteredProjects.length }} de {{ categoryProjects.length }} proyectos
            </p>
            <button
              class="text-xs font-semibold text-solar-500 hover:text-solar-600"
              @click="resetFilters"
            >
              Limpiar filtros
            </button>
          </div>

          <!-- Lista de proyectos (tareas apiladas y desplegables) -->
          <div v-if="filteredProjects.length" class="flex flex-col gap-3">
            <div
              v-for="(project, i) in filteredProjects"
              :key="project.id"
              class="animate-rise"
              :style="{ animationDelay: Math.min(i * 45, 350) + 'ms' }"
            >
              <ProjectCard
                :project="project"
                @open="openDetail"
                @delete="requestDelete"
                @update-status="updateStatus"
              />
            </div>
          </div>

          <!-- Vacío -->
          <div
            v-else
            class="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-16 text-center shadow-card ring-1 ring-navy-900/5"
          >
            <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-300">
              <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 4v5" />
              </svg>
            </span>
            <div>
              <p class="font-display text-sm font-semibold text-navy-700">Sin proyectos que coincidan</p>
              <p class="mt-0.5 text-xs text-navy-400">Ajusta la búsqueda o crea un nuevo proyecto.</p>
            </div>
            <button
              v-if="hasActiveFilters"
              class="rounded-lg bg-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-200"
              @click="resetFilters"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <!-- Columna panel de alarmas -->
        <aside class="lg:col-span-1">
          <AlarmsPanel :projects="categoryProjects" @resolve="resolveAlarm" />
        </aside>
      </div>
    </div>

    <!-- Drawer de detalle -->
    <ProjectDetailDrawer
      :project="selectedProject"
      :open="drawerOpen"
      @close="drawerOpen = false"
      @update-status="updateStatus"
      @add-photo="addPhoto"
      @remove-photo="removePhoto"
      @edit-photo="updatePhoto"
      @resolve-alarm="resolveAlarm"
      @register-alarm="registerAlarm"
      @delete-project="(id) => requestDelete(findProject(id))"
    />

    <!-- Modal nuevo proyecto -->
    <NewProjectModal
      :open="modalOpen"
      :category="categoryName"
      @close="modalOpen = false"
      @create="createProject"
    />

    <!-- Confirmación de eliminación -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="pendingDelete"
          class="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/50 p-4 backdrop-blur-sm"
          @click.self="cancelDelete"
        >
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
              </svg>
            </div>
            <h3 class="mt-4 text-center font-display text-base font-semibold text-navy-900">
              Eliminar proyecto
            </h3>
            <p class="mt-1 text-center text-sm text-navy-500">
              Vas a eliminar
              <span class="font-semibold text-navy-700">«{{ pendingDelete.name }}»</span>.
              Esta acción no se puede deshacer.
            </p>
            <div class="mt-5 flex gap-2">
              <button
                class="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-navy-500 ring-1 ring-navy-200 hover:bg-navy-50"
                @click="cancelDelete"
              >
                Cancelar
              </button>
              <button
                class="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
                @click="confirmDelete"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>