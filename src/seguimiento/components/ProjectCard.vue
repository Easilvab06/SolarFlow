<script setup>
/**
 * ProjectCard.vue — Tarjeta de proyecto en formato "tarea desplegable".
 * -----------------------------------------------------------------------------
 * Colapsada: fila-tarea compacta (token de estado + nombre + fecha + avance).
 * Expandida: línea de tiempo, fechas, equipo y alarmas activas, más acciones
 * rápidas (cambiar estado en línea / abrir detalle completo).
 *
 * Conserva la API previa (`open`, `delete`) y añade `update-status` para el
 * cambio de estado inline. Es un reemplazo directo del componente anterior.
 * -----------------------------------------------------------------------------
 */
import { ref, computed } from 'vue'
import { STATUSES, STATUS_LIST, ALARM_LEVELS, projectCode, formatDate } from '../data/mockData.js'
import StatusBadge from './StatusBadge.vue'
import TeamAvatars from './TeamAvatars.vue'
import ProgressRing from './ProgressRing.vue'

const props = defineProps({
  project: { type: Object, required: true },
  // Permite abrir un proyecto ya expandido desde el padre (opcional).
  defaultOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'delete', 'update-status'])

const expanded = ref(props.defaultOpen)
const toggle = () => (expanded.value = !expanded.value)

const status = computed(() => STATUSES[props.project.status])
const alarm = computed(() => ALARM_LEVELS[props.project.alarmLevel])

const activeAlarms = computed(
  () => props.project.alarms?.filter((a) => !a.resolved) ?? [],
)

const isDone = computed(() => props.project.status === 'completado')

// --- Fechas -----------------------------------------------------------------
function parseISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

// Días hasta la fecha fin (negativo = vencido).
const daysLeft = computed(() => {
  const end = parseISO(props.project.dates?.end)
  if (!end) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((end - today) / 86_400_000)
})

// Chip de vencimiento: etiqueta corta (fila) + larga (panel) + color.
const due = computed(() => {
  if (isDone.value) {
    return { short: 'Entregado', long: 'Proyecto entregado', cls: 'bg-emerald-50 text-emerald-600 ring-emerald-200' }
  }
  const d = daysLeft.value
  if (d === null) return { short: 'Sin fecha', long: 'Sin fecha fin', cls: 'bg-slate-50 text-slate-500 ring-slate-200' }
  if (d < 0) {
    const n = Math.abs(d)
    return { short: `Vencido · ${n} d`, long: `Vencido hace ${n} ${n === 1 ? 'día' : 'días'}`, cls: 'bg-rose-50 text-rose-600 ring-rose-200' }
  }
  if (d === 0) return { short: 'Vence hoy', long: 'Vence hoy', cls: 'bg-rose-50 text-rose-600 ring-rose-200' }
  if (d <= 14) return { short: `Vence · ${d} d`, long: `Vence en ${d} ${d === 1 ? 'día' : 'días'}`, cls: 'bg-solar-50 text-solar-600 ring-solar-200' }
  return { short: `${d} días`, long: `Faltan ${d} días`, cls: 'bg-navy-50 text-navy-500 ring-navy-200' }
})

// Token de estado (izquierda de la fila) — evoca el "check" de una tarea.
const tokenClass = computed(() => ({
  completado: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  detenido: 'bg-rose-50 text-rose-600 ring-rose-200',
  ejecucion: 'bg-sky-50 text-sky-600 ring-sky-200',
  revision: 'bg-violet-50 text-violet-600 ring-violet-200',
  pendiente: 'bg-slate-50 text-slate-500 ring-slate-200',
}[props.project.status] ?? 'bg-slate-50 text-slate-500 ring-slate-200'))

// Riel lateral: color de alarma para escanear el tablero de un vistazo.
const railClass = computed(() => {
  if (props.project.alarmLevel === 'roja') return 'bg-rose-500'
  if (props.project.alarmLevel === 'amarilla') return 'bg-amber-400'
  return isDone.value ? 'bg-emerald-400' : 'bg-navy-100'
})

function setStatus(key) {
  if (key === props.project.status) return
  emit('update-status', { projectId: props.project.id, status: key })
}
</script>

<template>
  <div
    class="group relative flex overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-navy-900/5 transition-shadow duration-200 hover:shadow-card-hover"
    :class="expanded ? 'ring-navy-900/10' : ''"
  >
    <!-- Riel de estado / alarma -->
    <span class="w-1.5 flex-none" :class="railClass" />

    <div class="min-w-0 flex-1">
      <!-- ===== Fila colapsada (cabecera clicable) ===== -->
      <button
        type="button"
        class="flex w-full items-center gap-3 px-4 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-solar-400"
        :aria-expanded="expanded"
        @click="toggle"
      >
        <!-- Token de estado -->
        <span
          class="grid h-10 w-10 flex-none place-items-center rounded-xl ring-1 transition-colors"
          :class="tokenClass"
        >
          <svg v-if="isDone" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <svg v-else-if="project.status === 'detenido'" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
          <span v-else class="h-2.5 w-2.5 rounded-full" :class="status.dot" />
        </span>

        <!-- Nombre + meta -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3
              class="truncate font-display text-[15px] font-semibold leading-snug text-navy-900"
              :class="{ 'text-navy-400 line-through decoration-navy-200': isDone }"
            >
              {{ project.name }}
            </h3>
            <span
              v-if="activeAlarms.length"
              class="inline-flex flex-none items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold"
              :class="[alarm.badge, project.alarmLevel === 'roja' ? 'animate-pulseRing' : '']"
              :title="`${activeAlarms.length} alarma(s) activa(s)`"
            >
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              {{ activeAlarms.length }}
            </span>
          </div>
          <p class="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-navy-400">
            <span class="font-mono text-[11px] text-navy-300">{{ projectCode(project.id) }}</span>
            <span class="text-navy-200">·</span>
            <span class="truncate">{{ project.client }}</span>
          </p>
        </div>

        <!-- Chip de fecha (siempre visible: las fechas al frente) -->
        <span
          class="hidden flex-none items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 sm:inline-flex"
          :class="due.cls"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
            <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v3m8-3v3" />
          </svg>
          {{ due.short }}
        </span>

        <!-- Avance compacto -->
        <ProgressRing :value="project.progress" :size="40" :stroke="4" class="flex-none" />

        <!-- Chevron -->
        <svg
          class="h-5 w-5 flex-none text-navy-300 transition-transform duration-300"
          :class="expanded ? 'rotate-180' : ''"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <!-- ===== Cuerpo desplegable (acordeón por CSS grid) ===== -->
      <div
        class="grid transition-all duration-300 ease-out"
        :class="expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      >
        <div class="overflow-hidden">
          <div class="space-y-4 border-t border-dashed border-navy-100 px-4 pb-4 pt-4">
            <!-- Estado + vencimiento (visible también en móvil) -->
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge :config="status" />
              <span
                class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1"
                :class="due.cls"
              >
                {{ due.long }}
              </span>
              <span class="ml-auto flex items-center gap-1 text-[12px] text-navy-400">
                <svg class="h-3.5 w-3.5 flex-none text-navy-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span class="truncate">{{ project.location }}</span>
              </span>
            </div>

            <!-- Línea de tiempo Inicio → Fin (fechas + avance juntos) -->
            <div>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-[10px] font-medium uppercase tracking-wide text-navy-400">Inicio</p>
                  <p class="font-mono text-[13px] font-medium text-navy-700">{{ formatDate(project.dates.start) }}</p>
                </div>
                <p class="font-mono text-[13px] font-bold tabular text-navy-900">{{ project.progress }}%</p>
                <div class="text-right">
                  <p class="text-[10px] font-medium uppercase tracking-wide text-navy-400">Fin estimado</p>
                  <p class="font-mono text-[13px] font-medium text-navy-700">{{ formatDate(project.dates.end) }}</p>
                </div>
              </div>
              <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-100">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="isDone ? 'bg-gradient-to-r from-emerald-400 to-emerald-300' : 'bg-gradient-to-r from-solar-400 to-solar-300'"
                  :style="{ width: Math.max(2, project.progress) + '%' }"
                />
              </div>
            </div>

            <!-- Equipo -->
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <TeamAvatars :team="project.team" size="sm" :max="4" />
                <span class="text-[12px] text-navy-400">
                  {{ project.team.length }} {{ project.team.length === 1 ? 'persona' : 'personas' }}
                </span>
              </div>
            </div>

            <!-- Alarmas activas (solo lectura; se gestionan en el detalle) -->
            <div v-if="activeAlarms.length" class="space-y-1.5">
              <p class="text-[10px] font-medium uppercase tracking-wide text-navy-400">
                Alarmas activas
              </p>
              <div
                v-for="a in activeAlarms.slice(0, 3)"
                :key="a.id"
                class="flex items-start gap-2 rounded-xl bg-navy-50/70 px-3 py-2 ring-1 ring-navy-100"
              >
                <span class="mt-1 h-2 w-2 flex-none rounded-full" :class="ALARM_LEVELS[a.level].dot" />
                <div class="min-w-0">
                  <p class="truncate text-[12.5px] font-medium text-navy-700">{{ a.title }}</p>
                  <p class="font-mono text-[10.5px] text-navy-400">{{ formatDate(a.date) }}</p>
                </div>
              </div>
            </div>

            <!-- Cambiar estado en línea (afín a una app de tareas) -->
            <div>
              <p class="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-navy-400">
                Cambiar estado
              </p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="s in STATUS_LIST"
                  :key="s.key"
                  type="button"
                  class="rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all"
                  :class="project.status === s.key
                    ? s.badge + ' ring-2 ring-solar-300 ring-offset-1'
                    : 'bg-navy-50 text-navy-500 ring-1 ring-navy-200 hover:bg-navy-100'"
                  @click.stop="setStatus(s.key)"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>

            <!-- Acciones -->
            <div class="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl bg-navy-800 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-900"
                @click.stop="emit('open', project)"
              >
                Abrir detalle
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium text-navy-400 ring-1 ring-navy-200 transition-colors hover:bg-rose-50 hover:text-rose-500 hover:ring-rose-200"
                title="Eliminar proyecto"
                @click.stop="emit('delete', project)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>