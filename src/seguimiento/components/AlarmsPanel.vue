<script setup>
import { computed } from 'vue'
import { ALARM_LEVELS, projectCode, formatDate } from '../data/mockData.js'

const props = defineProps({
  projects: { type: Array, default: () => [] },
})

const emit = defineEmits(['resolve'])

// Aplana las alarmas activas de todos los proyectos y las ordena por prioridad.
const activeAlarms = computed(() => {
  const order = { roja: 0, amarilla: 1 }
  return props.projects
    .flatMap((p) =>
      (p.alarms || [])
        .filter((a) => !a.resolved)
        .map((a) => ({ ...a, projectId: p.id, projectName: p.name })),
    )
    .sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9))
})

const criticalCount = computed(
  () => activeAlarms.value.filter((a) => a.level === 'roja').length,
)
</script>

<template>
  <div class="overflow-hidden rounded-2xl bg-white shadow-glass ring-1 ring-navy-900/5 lg:sticky lg:top-6">
    <!-- Encabezado sala de control -->
    <div
      class="relative overflow-hidden bg-control px-5 py-5"
    >
      <span class="pointer-events-none absolute -right-8 -top-10 h-32 w-32 animate-floatGlow rounded-full bg-solar-400/25 blur-2xl" />
      <!-- Línea de barrido dorada -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <span class="block h-px w-1/3 animate-sheen bg-solar-sheen" />
      </div>

      <div class="relative flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/10 text-solar-300 ring-1 ring-white/15 shadow-inset">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div>
            <h3 class="font-display text-sm font-bold text-white">Sala de control</h3>
            <p class="font-mono text-[11px] text-navy-200">
              {{ activeAlarms.length }} activas · {{ criticalCount }} críticas
            </p>
          </div>
        </div>
        <span
          v-if="criticalCount"
          class="flex h-8 items-center gap-1.5 rounded-lg bg-rose-500/90 px-2.5 font-mono text-xs font-bold text-white ring-1 ring-rose-300/40"
        >
          <span class="h-1.5 w-1.5 animate-pulseRing rounded-full bg-white" />
          {{ criticalCount }}
        </span>
      </div>
    </div>

    <div class="p-4">
      <ul v-if="activeAlarms.length" class="space-y-2">
        <li
          v-for="alarm in activeAlarms"
          :key="alarm.id"
          class="group relative flex items-start gap-3 overflow-hidden rounded-xl p-3 pl-4 transition-colors"
          :class="alarm.level === 'roja' ? 'bg-rose-50/70 hover:bg-rose-50' : 'bg-amber-50/70 hover:bg-amber-50'"
        >
          <span
            class="absolute inset-y-0 left-0 w-1"
            :class="alarm.level === 'roja' ? 'bg-rose-500' : 'bg-amber-400'"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 flex-none rounded-full" :class="ALARM_LEVELS[alarm.level].dot" />
              <p class="text-[13px] font-semibold text-navy-800">{{ alarm.title }}</p>
            </div>
            <p class="mt-0.5 pl-3.5 text-xs leading-relaxed text-navy-500">{{ alarm.description }}</p>
            <p class="mt-1 flex items-center gap-1.5 pl-3.5 font-mono text-[10px] text-navy-400">
              <span class="text-navy-300">{{ projectCode(alarm.projectId) }}</span>
              <span class="truncate">{{ alarm.projectName }}</span>
              <span class="text-navy-300">· {{ formatDate(alarm.date) }}</span>
            </p>
          </div>
          <button
            class="flex-none rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-navy-500 ring-1 ring-navy-200 transition-colors hover:bg-emerald-500 hover:text-white hover:ring-emerald-500"
            @click="emit('resolve', { projectId: alarm.projectId, alarmId: alarm.id })"
          >
            Resolver
          </button>
        </li>
      </ul>

      <div
        v-else
        class="flex flex-col items-center gap-1 rounded-xl bg-emerald-50/60 px-4 py-9 text-center"
      >
        <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-500">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p class="mt-1 font-display text-sm font-semibold text-navy-800">Todo bajo control</p>
        <p class="text-xs text-navy-400">Ningún proyecto tiene alertas activas.</p>
      </div>
    </div>
  </div>
</template>
