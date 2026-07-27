<script setup>
/**
 * App.vue — Demo de integración (portal de módulos).
 * -----------------------------------------------------------------------------
 * Reproduce el portal de módulos de la plataforma. Al abrir una categoría,
 * monta el módulo <SeguimientoProyectos> pasándole la categoría seleccionada.
 * En una app real esto se haría con Vue Router (ver README).
 *
 * NOTA: la lógica, los imports y los eventos son idénticos a la versión previa.
 * Solo se elevó la presentación (jerarquía tipográfica, hero de sala de control,
 * tarjetas de módulo y microinteracciones).
 * -----------------------------------------------------------------------------
 */
import { ref, computed } from 'vue'
import SeguimientoProyectos from './seguimiento/SeguimientoProyectos.vue'
import { MOCK_PROJECTS } from './seguimiento/data/mockData.js'

// Categorías del portal (íconos como SVG inline para no depender de librerías).
const categories = [
  {
    name: 'Cotizador EPC',
    desc: 'Cotizaciones de sistemas fotovoltaicos EPC.',
    tile: 'text-rose-500',
    tileBg: 'bg-rose-50 group-hover:bg-rose-100',
    icon: 'M13 2 3 14h7l-1 8 10-12h-7l1-8Z',
  },
  {
    name: 'Cotización y Suministro',
    desc: 'Pipeline de cotizaciones y suministro de equipos.',
    tile: 'text-orange-500',
    tileBg: 'bg-orange-50 group-hover:bg-orange-100',
    icon: 'M21 8 12 3 3 8m18 0-9 5-9-5m18 0v8l-9 5-9-5V8',
  },
  {
    name: 'Mantenimiento General',
    desc: 'O&M solar fotovoltaico — preventivo y correctivo.',
    tile: 'text-emerald-500',
    tileBg: 'bg-emerald-50 group-hover:bg-emerald-100',
    icon: 'm12 20 8-8-4-4-8 8v4h4Zm4-12 2-2 4 4-2 2',
  },
  {
    name: 'EDC',
    desc: 'Estaciones de carga para vehículos eléctricos.',
    tile: 'text-violet-500',
    tileBg: 'bg-violet-50 group-hover:bg-violet-100',
    icon: 'M5 17h14M6 17V9l2-4h8l2 4v8M7 21v-2m10 2v-2M8 9h8',
  },
  {
    name: 'Interventoría y Consultoría',
    desc: 'Consultoría técnica e interventoría de proyectos.',
    tile: 'text-amber-500',
    tileBg: 'bg-amber-50 group-hover:bg-amber-100',
    icon: 'M9 12h6m-6 4h6M9 8h6M5 4h14v16H5z',
  },
  {
    name: 'Ingeniería',
    desc: 'Diseño e ingeniería de proyectos solares.',
    tile: 'text-sky-500',
    tileBg: 'bg-sky-50 group-hover:bg-sky-100',
    icon: 'M4 20 20 4M4 20h6M4 20v-6',
  },
  {
    name: 'Eficiencia Energética',
    desc: 'Proyectos de eficiencia y ahorro energético.',
    tile: 'text-yellow-500',
    tileBg: 'bg-yellow-50 group-hover:bg-yellow-100',
    icon: 'M9 21h6m-5 0v-3m4 3v-3M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z',
  },
]

// Conteo real de proyectos por categoría, para que cada módulo muestre su carga.
const countByCategory = computed(() => {
  const map = {}
  for (const p of MOCK_PROJECTS) map[p.category] = (map[p.category] || 0) + 1
  return map
})

const totalProjects = MOCK_PROJECTS.length
const activeAlarms = MOCK_PROJECTS.reduce(
  (acc, p) => acc + (p.alarms?.filter((a) => !a.resolved).length ?? 0),
  0,
)

const selectedCategory = ref(null)

function open(cat) {
  selectedCategory.value = cat.name
}
function back() {
  selectedCategory.value = null
}
</script>

<template>
  <!-- Módulo de seguimiento (cuando hay categoría seleccionada) -->
  <SeguimientoProyectos
    v-if="selectedCategory"
    :category-name="selectedCategory"
    @back="back"
    @project-created="(p) => console.log('Proyecto creado:', p)"
    @project-updated="(p) => console.log('Proyecto actualizado:', p)"
  />

  <!-- Portal de módulos (vista principal) -->
  <main v-else class="min-h-screen bg-navy-50 bg-grid-light bg-grid">
    <!-- ===== Barra de marca (vidrio, fija) ===== -->
    <div class="sticky top-0 z-40 border-b border-navy-100 bg-white/70 backdrop-blur-xl">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2.5">
          <span class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-solar-400 shadow-solar">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </span>
          <div class="leading-none">
            <span class="font-display text-base font-bold tracking-tight text-navy-900">SolarFlow</span>
            <span class="ml-1 rounded-md bg-navy-50 px-1.5 py-0.5 align-middle font-mono text-[9px] font-semibold uppercase tracking-wider text-navy-400 ring-1 ring-navy-100">Control</span>
          </div>
        </div>
        <div class="hidden items-center gap-2 sm:flex">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p class="font-mono text-[11px] text-navy-400">Sistema en línea · Boyacá</p>
        </div>
      </div>
    </div>

    <!-- ===== Héroe sala de control ===== -->
    <section class="relative overflow-hidden bg-control">
      <span class="pointer-events-none absolute -left-24 -top-28 h-80 w-80 animate-floatGlow rounded-full bg-solar-400/15 blur-3xl" />
      <span class="pointer-events-none absolute -right-16 top-6 h-64 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      <!-- Barrido de luz superior -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <span class="block h-px w-1/4 animate-sheen bg-solar-sheen" />
      </div>

      <div class="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p class="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-solar-300">
          <span class="h-1.5 w-1.5 rounded-full bg-solar-400" />
          Sala de control · Boyacá
        </p>
        <h1 class="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
          Todos tus proyectos de energía,
          <span class="bg-gradient-to-r from-solar-300 to-solar-400 bg-clip-text text-transparent">bajo control.</span>
        </h1>
        <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-navy-200">
          Abre un módulo para ver el estado en vivo de sus proyectos, cargar evidencias
          y atender alarmas antes de que se conviertan en retrasos.
        </p>

        <!-- Lecturas del portal (tablero de instrumento) -->
        <div class="mt-9 inline-flex flex-wrap items-center gap-6 rounded-2xl bg-white/[0.04] px-5 py-4 ring-1 ring-white/10 shadow-glass backdrop-blur-sm sm:gap-8">
          <div>
            <p class="font-mono text-2xl font-bold tabular text-white">{{ categories.length }}</p>
            <p class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-navy-300">Módulos</p>
          </div>
          <span class="h-9 w-px bg-white/10" />
          <div>
            <p class="font-mono text-2xl font-bold tabular text-white">{{ totalProjects }}</p>
            <p class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-navy-300">Proyectos</p>
          </div>
          <span class="h-9 w-px bg-white/10" />
          <div>
            <p class="flex items-center gap-1.5 font-mono text-2xl font-bold tabular text-rose-300">
              <span v-if="activeAlarms > 0" class="h-1.5 w-1.5 animate-pulseRing rounded-full bg-rose-400" />
              {{ activeAlarms }}
            </p>
            <p class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-navy-300">Alarmas activas</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Módulos ===== -->
    <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div class="mb-6 flex items-baseline justify-between">
        <h2 class="font-display text-lg font-bold text-navy-900">Módulos del sistema</h2>
        <p class="hidden text-sm text-navy-400 sm:block">Selecciona una categoría para gestionar su seguimiento.</p>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="(cat, i) in categories"
          :key="cat.name"
          class="group relative flex animate-rise flex-col overflow-hidden rounded-2xl bg-white p-6 text-left shadow-card ring-1 ring-navy-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-solar-400"
          :style="{ animationDelay: Math.min(i * 55, 380) + 'ms' }"
          @click="open(cat)"
        >
          <!-- Acento superior que aparece al hover -->
          <span class="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-solar-400 to-solar-300 transition-transform duration-300 group-hover:scale-x-100" />
          <!-- Índice tenue (marca de tablero) -->
          <span class="pointer-events-none absolute right-5 top-5 font-mono text-[11px] font-semibold text-navy-200 transition-colors group-hover:text-solar-300">
            {{ String(i + 1).padStart(2, '0') }}
          </span>

          <div class="flex items-start justify-between">
            <span
              class="flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-navy-900/5 transition-colors"
              :class="[cat.tile, cat.tileBg]"
            >
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path :d="cat.icon" />
              </svg>
            </span>
          </div>

          <h3 class="mt-4 font-display text-base font-semibold text-navy-900">{{ cat.name }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-navy-400">{{ cat.desc }}</p>

          <!-- Pie de tarjeta: carga real + llamada -->
          <div class="mt-5 flex items-center justify-between border-t border-dashed border-navy-100 pt-3">
            <span
              v-if="countByCategory[cat.name]"
              class="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-navy-500"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-navy-300" />
              {{ countByCategory[cat.name] }} {{ countByCategory[cat.name] === 1 ? 'proyecto' : 'proyectos' }}
            </span>
            <span v-else class="font-mono text-[11px] text-navy-300">Sin proyectos</span>

            <span class="flex items-center gap-1 text-[13px] font-semibold text-solar-500 transition-transform duration-300 group-hover:translate-x-0.5">
              Abrir
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M5 12h14m0 0-6-6m6 6-6 6" />
              </svg>
            </span>
          </div>
        </button>
      </div>

      <p class="mt-10 text-center font-mono text-[11px] text-navy-300">
        Demo de integración · haz clic en cualquier módulo para abrir el seguimiento.
      </p>
    </div>
  </main>
</template>