<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { STATUS_LIST, nextId, initials, avatarColor } from '../data/mockData.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  category: { type: String, default: '' },
})

const emit = defineEmits(['close', 'create'])

// Catálogo de asesores para el menú desplegable.
const ADVISORS = [
  'Invitado',
  'Mauricio',
  'Juan Sebastián',
  'Santiago',
  'Mario',
  'Wilson',
  'Juan',
  'Guiomar Gutiérrez',
  'Jonathan Rodríguez',
  'Administración',
]

const blankForm = () => ({
  name: '',
  client: '',
  location: '',
  status: 'pendiente',
  start: '',
  end: '',
  teamRaw: '', // nombres separados por coma
  advisor: '', // asesor asignado
  observations: '', // observaciones del proyecto
})

const form = reactive(blankForm())
const initialPhotos = ref([]) // [{ id, description, date, url }]
const fileInput = ref(null)
const error = ref('')

// --- Dropdown custom de asesor ---
const advisorOpen = ref(false)
const advisorRef = ref(null)

function selectAdvisor(name) {
  form.advisor = name
  advisorOpen.value = false
}

function onClickOutside(e) {
  if (advisorRef.value && !advisorRef.value.contains(e.target)) advisorOpen.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

// Reinicia el formulario cada vez que se abre.
watch(
  () => props.open,
  (val) => {
    if (val) {
      Object.assign(form, blankForm())
      initialPhotos.value = []
      error.value = ''
      advisorOpen.value = false
    }
  },
)

function pickPhotos() {
  fileInput.value?.click()
}

function onPhotos(e) {
  Array.from(e.target.files).forEach((file) => {
    const reader = new FileReader()
    reader.onload = () => {
      initialPhotos.value.push({
        id: nextId(),
        description: file.name,
        date: new Date().toISOString().slice(0, 10),
        url: reader.result, // data URL persistente
      })
    }
    reader.readAsDataURL(file)
  })
  e.target.value = ''
}

function submit() {
  if (!form.name.trim() || !form.client.trim()) {
    error.value = 'El nombre del proyecto y el cliente son obligatorios.'
    return
  }
  const team = form.teamRaw
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => ({ name, role: 'Responsable' }))

  emit('create', {
    id: nextId(),
    name: form.name.trim(),
    client: form.client.trim(),
    location: form.location.trim() || 'Sin ubicación',
    category: props.category,
    status: form.status,
    progress: 0,
    alarmLevel: 'none',
    dates: { start: form.start || '—', end: form.end || '—' },
    team,
    advisor: form.advisor || 'Sin asignar',
    observations: form.observations.trim(),
    photos: [...initialPhotos.value],
    alarms: [],
  })
}

const inputClass =
  'w-full rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-700 ring-1 ring-navy-200 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-solar-400'
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400'
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-40 flex items-center justify-center bg-navy-950/50 p-4 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <Transition name="pop" appear>
          <div v-if="open" class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <!-- Header navy -->
            <header class="relative flex items-center justify-between overflow-hidden bg-control px-6 py-5">
              <span class="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-solar-400/15 blur-2xl" />
              <div class="relative">
                <h2 class="font-display text-lg font-bold text-white">Nuevo proyecto</h2>
                <p class="mt-0.5 font-mono text-[11px] text-solar-300">{{ category || '—' }}</p>
              </div>
              <button
                class="relative rounded-lg p-2 text-navy-300 transition-colors hover:bg-white/10 hover:text-white"
                @click="emit('close')"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <!-- Body -->
            <div class="max-h-[68vh] space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label :class="labelClass">Nombre del proyecto *</label>
                <input v-model="form.name" type="text" :class="inputClass" placeholder="Ej. Planta Solar 1.2 MW" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label :class="labelClass">Cliente *</label>
                  <input v-model="form.client" type="text" :class="inputClass" />
                </div>
                <div>
                  <label :class="labelClass">Ubicación</label>
                  <input v-model="form.location" type="text" :class="inputClass" />
                </div>
              </div>

              <div>
                <label :class="labelClass">
                  Responsables <span class="normal-case text-navy-300">(separados por coma)</span>
                </label>
                <input v-model="form.teamRaw" type="text" :class="inputClass" placeholder="Laura Beltrán, Carlos Rincón" />
              </div>

              <div ref="advisorRef" class="relative">
                <label :class="labelClass">Asesor</label>
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm ring-1 ring-navy-200 transition-colors hover:bg-navy-100 focus:outline-none focus:ring-2 focus:ring-solar-400"
                  @click="advisorOpen = !advisorOpen"
                >
                  <span class="flex min-w-0 items-center gap-2.5">
                    <span
                      v-if="form.advisor"
                      class="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-semibold"
                      :class="avatarColor(form.advisor)"
                    >
                      {{ initials(form.advisor) }}
                    </span>
                    <span
                      v-else
                      class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-navy-100 text-navy-300"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <circle cx="12" cy="8" r="3.2" />
                        <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" />
                      </svg>
                    </span>
                    <span class="truncate" :class="form.advisor ? 'font-medium text-navy-700' : 'text-navy-300'">
                      {{ form.advisor || 'Selecciona un asesor' }}
                    </span>
                  </span>
                  <svg
                    class="h-4 w-4 flex-none text-navy-400 transition-transform duration-200"
                    :class="{ 'rotate-180': advisorOpen }"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                <Transition name="menu">
                  <div
                    v-if="advisorOpen"
                    class="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-navy-900/10"
                  >
                    <ul class="max-h-56 overflow-y-auto py-1">
                      <li v-for="a in ADVISORS" :key="a">
                        <button
                          type="button"
                          class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-navy-50"
                          :class="form.advisor === a ? 'bg-solar-50/70' : ''"
                          @click="selectAdvisor(a)"
                        >
                          <span
                            class="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-semibold"
                            :class="avatarColor(a)"
                          >
                            {{ initials(a) }}
                          </span>
                          <span class="flex-1 truncate text-navy-700">{{ a }}</span>
                          <svg
                            v-if="form.advisor === a"
                            class="h-4 w-4 flex-none text-solar-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.6"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </button>
                      </li>
                    </ul>
                  </div>
                </Transition>
              </div>

              <div>
                <label :class="labelClass">Observaciones</label>
                <textarea
                  v-model="form.observations"
                  rows="3"
                  :class="inputClass + ' resize-none'"
                  placeholder="Notas adicionales sobre el proyecto..."
                />
              </div>

              <div>
                <label :class="labelClass">Estado inicial</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="s in STATUS_LIST"
                    :key="s.key"
                    type="button"
                    class="rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all"
                    :class="form.status === s.key
                      ? s.badge + ' ring-2 ring-solar-300 ring-offset-1'
                      : 'bg-navy-50 text-navy-500 ring-1 ring-navy-200 hover:bg-navy-100'"
                    @click="form.status = s.key"
                  >
                    {{ s.label }}
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label :class="labelClass">Fecha inicio</label>
                  <input v-model="form.start" type="date" :class="inputClass" />
                </div>
                <div>
                  <label :class="labelClass">Fecha fin estimada</label>
                  <input v-model="form.end" type="date" :class="inputClass" />
                </div>
              </div>

              <!-- Fotos iniciales -->
              <div>
                <label :class="labelClass">Fotos iniciales</label>
                <button
                  type="button"
                  class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/60 px-4 py-3 text-sm text-navy-500 transition-colors hover:border-solar-300 hover:text-navy-600"
                  @click="pickPhotos"
                >
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                    <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
                    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                  Cargar imágenes
                </button>
                <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onPhotos" />
                <div v-if="initialPhotos.length" class="mt-2 flex flex-wrap gap-2">
                  <img
                    v-for="p in initialPhotos"
                    :key="p.id"
                    :src="p.url"
                    class="h-12 w-12 rounded-lg object-cover ring-1 ring-navy-200"
                  />
                </div>
              </div>

              <p v-if="error" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-200">{{ error }}</p>
            </div>

            <!-- Footer -->
            <footer class="flex justify-end gap-2 border-t border-navy-100 bg-navy-50/50 px-6 py-4">
              <button
                class="rounded-xl px-4 py-2.5 text-sm font-medium text-navy-500 hover:bg-navy-100"
                @click="emit('close')"
              >
                Cancelar
              </button>
              <button
                class="inline-flex items-center gap-2 rounded-xl bg-solar-400 px-4 py-2.5 text-sm font-semibold text-navy-900 shadow-solar transition-all hover:bg-solar-300 active:scale-[0.98]"
                @click="submit"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                  <path d="M12 5v14m-7-7h14" />
                </svg>
                Crear proyecto
              </button>
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
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
.pop-enter-active {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease;
}
.pop-enter-from {
  transform: translateY(12px) scale(0.97);
  opacity: 0;
}
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>