<script setup>
/**
 * ProgressRing.vue — medidor radial tipo instrumento.
 * Reemplaza la barra de progreso genérica por un "gauge" que evoca un panel
 * de control de energía. El arco se anima al montar el componente.
 */
import { computed, ref, onMounted, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 }, // 0..100
  size: { type: Number, default: 56 },
  stroke: { type: Number, default: 5 },
  // Color del arco por umbral de avance
  colorClass: { type: String, default: '' },
})

const display = ref(0)

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dash = computed(
  () => circumference.value * (1 - Math.min(100, Math.max(0, display.value)) / 100),
)

// Color automático según avance si no se pasa uno explícito.
const stroke = computed(() => {
  if (props.colorClass) return props.colorClass
  const p = props.value
  if (p >= 100) return 'text-emerald-500'
  if (p >= 60) return 'text-solar-400'
  if (p >= 30) return 'text-sky-500'
  return 'text-slate-300'
})

function animateTo(target) {
  const start = display.value
  const t0 = performance.now()
  const dur = 700
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur)
    const eased = 1 - Math.pow(1 - k, 3)
    display.value = start + (target - start) * eased
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => animateTo(props.value))
watch(() => props.value, (v) => animateTo(v))
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        class="text-slate-100"
        :stroke="'currentColor'"
        :stroke-width="stroke"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :class="stroke"
        stroke="currentColor"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dash"
      />
    </svg>
    <span class="absolute font-mono text-xs font-semibold tabular text-navy-800">
      {{ Math.round(display) }}<span class="text-[9px] text-navy-300">%</span>
    </span>
  </div>
</template>
