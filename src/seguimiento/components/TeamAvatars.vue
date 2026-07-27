<script setup>
import { computed } from 'vue'
import { initials, avatarColor } from '../data/mockData.js'

const props = defineProps({
  team: {
    type: Array,
    default: () => [], // [{ name, role }]
  },
  max: {
    type: Number,
    default: 4,
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md'
  },
})

const visible = computed(() => props.team.slice(0, props.max))
const overflow = computed(() => Math.max(0, props.team.length - props.max))

const sizeClass = computed(() =>
  props.size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
)
</script>

<template>
  <div class="flex items-center -space-x-2">
    <div
      v-for="member in visible"
      :key="member.name"
      class="flex items-center justify-center rounded-full font-semibold ring-2 ring-white transition-transform hover:z-10 hover:-translate-y-0.5"
      :class="[sizeClass, avatarColor(member.name)]"
      :title="`${member.name} · ${member.role}`"
    >
      {{ initials(member.name) }}
    </div>
    <div
      v-if="overflow > 0"
      class="flex items-center justify-center rounded-full bg-navy-100 font-semibold text-navy-500 ring-2 ring-white"
      :class="sizeClass"
      :title="`${overflow} más`"
    >
      +{{ overflow }}
    </div>
  </div>
</template>
