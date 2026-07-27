<script setup>
// Badge genérico. Sirve tanto para estados del pipeline como para niveles
// de alarma; solo hay que pasarle el objeto de configuración correspondiente.
defineProps({
  config: {
    type: Object,
    required: true, // { label, dot, badge }
  },
  showDot: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
    :class="config.badge"
  >
    <span v-if="showDot" class="h-1.5 w-1.5 rounded-full" :class="config.dot" />
    {{ config.label }}
  </span>
</template>
