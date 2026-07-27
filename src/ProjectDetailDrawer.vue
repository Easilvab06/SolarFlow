<script setup>
import { computed, ref } from 'vue'
import {
  STATUSES,
  STATUS_LIST,
  ALARM_LEVELS,
  initials,
  avatarColor,
  projectCode,
  formatDate,
  nextId,
} from '../data/mockData.js'
import StatusBadge from './StatusBadge.vue'
import PhotoGallery from './PhotoGallery.vue'

const props = defineProps({
  project: { type: Object, default: null },
  open: { type: Boolean, default: false },
})

const emit = defineEmits([
  'close',
  'update-status',
  'add-photo',
  'remove-photo',
  'edit-photo',
  'resolve-alarm',
  'register-alarm',
  'delete-project',
])

const tab = ref('general') // 'general' | 'fotos' | 'alarmas'

// --- Registrar nueva alarma ---
const showAlarmForm = ref(false)
const newAlarm = ref({ level: 'amarilla', title: '', description: '' })

function submitAlarm() {
  if (!newAlarm.value.title.trim()) return
  emit('register-alarm', {
    projectId: props.project.id,
    alarm: {
      id: nextId(),
      level: newAlarm.value.level,
      title: newAlarm.value.title.trim(),
      description: newAlarm.value.description.trim(),
      date: new Date().toISOString().slice(0, 10),
      resolved: false,
    },
  })
  newAlarm.value = { level: 'amarilla', title: '', description: '' }
  showAlarmForm.value = false
}

const status = computed(() => (props.project ? STATUSES[props.project.status] : null))

const activeAlarmCount = computed(
  () => props.project?.alarms?.filter((a) => !a.resolved).length ?? 0,
)

const tabs = computed(() => [
  { key: 'general', label: 'General', count: null },
  { key: 'fotos', label: 'Evidencias', count: props.project?.photos?.length ?? 0 },
  { key: 'alarmas', label: 'Alarmas', count: activeAlarmCount.value || null },
])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open && project"
        class="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm"
        @click="emit('close')"
      />
    </Transition>

    <Transition name="slide">
      <aside
        v-if="open && project"
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-navy-50"
      >
        <!-- Header navy -->
        <header class="relative overflow-hidden bg-control px-6 py-5">
          <span class="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-solar-400/15 blur-2xl" />
          <div class="relative flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[11px] text-solar-300">{{ projectCode(project.id) }}</span>
                <StatusBadge :config="status" />
              </div>
              <h2 class="mt-2 truncate font-display text-lg font-bold text-white">{{ project.name }}</h2>
              <p class="mt-0.5 flex items-center gap-1.5 text-sm text-navy-200">
                <svg class="h-3.5 w-3.5 flex-none text-navy-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {{ project.client }} · {{ project.location }}
              </p>
            </div>
            <div class="flex flex-none items-center gap-1">
              <button
                class="rounded-lg p-2 text-navy-300 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
                title="Eliminar proyecto"
                @click="emit('delete-project', project.id)"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
                </svg>
              </button>
              <button
                class="rounded-lg p-2 text-navy-300 transition-colors hover:bg-white/10 hover:text-white"
                @click="emit('close')"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <nav class="relative mt-4 flex gap-1">
            <button
              v-for="t in tabs"
              :key="t.key"
              class="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="tab === t.key
                ? 'bg-white/10 text-white'
                : 'text-navy-300 hover:text-white'"
              @click="tab = t.key"
            >
              {{ t.label }}
              <span
                v-if="t.count"
                class="rounded-md bg-solar-400/20 px-1.5 font-mono text-[10px] font-bold text-solar-200"
              >
                {{ t.count }}
              </span>
            </button>
          </nav>
        </header>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-6">
          <!-- === GENERAL === -->
          <div v-if="tab === 'general'" class="space-y-4">
            <!-- Progreso -->
            <section class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-900/5">
              <div class="flex items-center justify-between text-sm">
                <span class="font-display font-semibold text-navy-700">Progreso general</span>
                <span class="font-mono text-lg font-bold tabular text-navy-900">{{ project.progress }}%</span>
              </div>
              <div class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-navy-100">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-solar-400 to-solar-300 transition-all duration-500"
                  :style="{ width: project.progress + '%' }"
                />
              </div>
              <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-xl bg-navy-50 px-3 py-2.5 ring-1 ring-navy-100">
                  <p class="text-[11px] font-medium uppercase tracking-wide text-navy-400">Inicio</p>
                  <p class="mt-0.5 font-mono text-sm font-medium text-navy-700">{{ formatDate(project.dates.start) }}</p>
                </div>
                <div class="rounded-xl bg-navy-50 px-3 py-2.5 ring-1 ring-navy-100">
                  <p class="text-[11px] font-medium uppercase tracking-wide text-navy-400">Fin estimado</p>
                  <p class="mt-0.5 font-mono text-sm font-medium text-navy-700">{{ formatDate(project.dates.end) }}</p>
                </div>
              </div>
            </section>

            <!-- Pipeline / cambio de estado -->
            <section class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-900/5">
              <h3 class="font-display text-sm font-semibold text-navy-700">Estado del pipeline</h3>
              <p class="mt-0.5 text-xs text-navy-400">Toca un estado para actualizar el proyecto.</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="s in STATUS_LIST"
                  :key="s.key"
                  class="rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all"
                  :class="project.status === s.key
                    ? s.badge + ' ring-2 ring-solar-300 ring-offset-1'
                    : 'bg-navy-50 text-navy-500 ring-1 ring-navy-200 hover:bg-navy-100'"
                  @click="emit('update-status', { projectId: project.id, status: s.key })"
                >
                  {{ s.label }}
                </button>
              </div>
            </section>

            <!-- Asesor y observaciones -->
            <section
              v-if="project.advisor || project.observations"
              class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-900/5"
            >
              <div v-if="project.advisor" class="flex items-center gap-3">
                <span
                  class="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-semibold"
                  :class="avatarColor(project.advisor)"
                >
                  {{ initials(project.advisor) }}
                </span>
                <div>
                  <p class="text-[11px] font-medium uppercase tracking-wide text-navy-400">Asesor</p>
                  <p class="text-sm font-medium text-navy-700">{{ project.advisor }}</p>
                </div>
              </div>
              <div v-if="project.observations" :class="project.advisor ? 'mt-4' : ''">
                <p class="text-[11px] font-medium uppercase tracking-wide text-navy-400">Observaciones</p>
                <p class="mt-1 whitespace-pre-line text-sm text-navy-600">{{ project.observations }}</p>
              </div>
            </section>

            <!-- Equipo -->
            <section class="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-900/5">
              <h3 class="font-display text-sm font-semibold text-navy-700">Equipo asignado</h3>
              <ul class="mt-3 space-y-2.5">
                <li v-for="member in project.team" :key="member.name" class="flex items-center gap-3">
                  <span
                    class="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-semibold"
                    :class="avatarColor(member.name)"
                  >
                    {{ initials(member.name) }}
                  </span>
                  <div>
                    <p class="text-sm font-medium text-navy-700">{{ member.name }}</p>
                    <p class="text-xs text-navy-400">{{ member.role }}</p>
                  </div>
                </li>
              </ul>
            </section>
          </div>

          <!-- === GALERÍA === -->
          <div v-else-if="tab === 'fotos'">
            <PhotoGallery
              :photos="project.photos"
              @add-photo="(photo) => emit('add-photo', { projectId: project.id, photo })"
              @remove-photo="(photoId) => emit('remove-photo', { projectId: project.id, photoId })"
              @edit-photo="(payload) => emit('edit-photo', { projectId: project.id, ...payload })"
            />
          </div>

          <!-- === ALARMAS === -->
          <div v-else-if="tab === 'alarmas'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-display text-sm font-semibold text-navy-700">Historial de alarmas</h3>
              <button
                class="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-900"
                @click="showAlarmForm = !showAlarmForm"
              >
                <svg v-if="!showAlarmForm" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                  <path d="M12 5v14m-7-7h14" />
                </svg>
                {{ showAlarmForm ? 'Cerrar' : 'Registrar alarma' }}
              </button>
            </div>

            <!-- Form registrar alarma -->
            <div v-if="showAlarmForm" class="rounded-2xl bg-white p-4 shadow-card ring-1 ring-navy-900/5">
              <div class="flex gap-2">
                <button
                  v-for="lvl in ['amarilla', 'roja']"
                  :key="lvl"
                  class="rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all"
                  :class="newAlarm.level === lvl
                    ? ALARM_LEVELS[lvl].badge + ' ring-2 ring-offset-1 ring-navy-200'
                    : 'bg-navy-50 text-navy-500 ring-1 ring-navy-200'"
                  @click="newAlarm.level = lvl"
                >
                  {{ ALARM_LEVELS[lvl].label }}
                </button>
              </div>
              <input
                v-model="newAlarm.title"
                type="text"
                placeholder="Título de la alarma"
                class="mt-3 w-full rounded-xl bg-navy-50 px-3 py-2 text-sm text-navy-700 ring-1 ring-navy-200 focus:outline-none focus:ring-2 focus:ring-solar-400"
              />
              <textarea
                v-model="newAlarm.description"
                rows="2"
                placeholder="Descripción (opcional)"
                class="mt-2 w-full resize-none rounded-xl bg-navy-50 px-3 py-2 text-sm text-navy-700 ring-1 ring-navy-200 focus:outline-none focus:ring-2 focus:ring-solar-400"
              />
              <div class="mt-3 flex justify-end">
                <button
                  class="rounded-lg bg-solar-400 px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-solar-300"
                  @click="submitAlarm"
                >
                  Guardar alarma
                </button>
              </div>
            </div>

            <!-- Lista -->
            <ul v-if="project.alarms.length" class="space-y-2.5">
              <li
                v-for="alarm in project.alarms"
                :key="alarm.id"
                class="relative overflow-hidden rounded-2xl bg-white p-4 shadow-card ring-1 ring-navy-900/5"
                :class="{ 'opacity-60': alarm.resolved }"
              >
                <span
                  class="absolute inset-y-0 left-0 w-1"
                  :class="alarm.resolved ? 'bg-emerald-400' : (alarm.level === 'roja' ? 'bg-rose-500' : 'bg-amber-400')"
                />
                <div class="flex items-start justify-between gap-3 pl-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="h-2 w-2 flex-none rounded-full" :class="ALARM_LEVELS[alarm.level].dot" />
                      <p class="text-sm font-semibold text-navy-800" :class="{ 'line-through': alarm.resolved }">
                        {{ alarm.title }}
                      </p>
                    </div>
                    <p class="mt-1 text-xs text-navy-500">{{ alarm.description }}</p>
                    <p class="mt-1 font-mono text-[11px] text-navy-400">{{ formatDate(alarm.date) }}</p>
                  </div>
                  <button
                    v-if="!alarm.resolved"
                    class="flex-none rounded-lg px-2.5 py-1 text-xs font-semibold text-navy-500 ring-1 ring-navy-200 transition-colors hover:bg-emerald-500 hover:text-white hover:ring-emerald-500"
                    @click="emit('resolve-alarm', { projectId: project.id, alarmId: alarm.id })"
                  >
                    Resolver
                  </button>
                  <span v-else class="flex flex-none items-center gap-1 text-xs font-semibold text-emerald-500">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Resuelta
                  </span>
                </div>
              </li>
            </ul>
            <p v-else class="rounded-2xl bg-white px-4 py-8 text-center text-sm text-navy-400 shadow-card ring-1 ring-navy-900/5">
              Este proyecto no tiene alarmas registradas.
            </p>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
