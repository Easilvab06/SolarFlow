<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  label: { type: String, default: '' },
  accent: { type: String, default: 'text-white' }, // color del número
  glow: { type: Boolean, default: false }, // resalta el tile clave
})

const shown = ref(0)

function run(target) {
  const start = shown.value
  const t0 = performance.now()
  const dur = 650
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur)
    const eased = 1 - Math.pow(1 - k, 3)
    shown.value = Math.round(start + (target - start) * eased)
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => run(props.value))
watch(() => props.value, (v) => run(v))
</script>

<template>
  <div
    class="relative overflow-hidden rounded-xl px-4 py-3 ring-1 backdrop-blur-sm transition-colors"
    :class="glow
      ? 'bg-solar-400/10 ring-solar-400/30'
      : 'bg-white/5 ring-white/10 hover:bg-white/10'"
  >
    <p class="font-mono text-2xl font-bold tabular leading-none" :class="accent">
      {{ shown }}
    </p>
    <p class="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-navy-200">
      {{ label }}
    </p>
  </div>
</template>
