<script setup>
import { ref } from 'vue'
import { photoGradient, formatDate, nextId } from '../data/mockData.js'
import ImageEditor from './ImageEditor.vue'

const props = defineProps({
  photos: {
    type: Array,
    default: () => [], // [{ id, description, date, url? }]
  },
})

const emit = defineEmits(['add-photo', 'remove-photo', 'edit-photo'])

const isDragging = ref(false)
const description = ref('')
const fileInput = ref(null)
const preview = ref(null) // { url, fileName }

// --- Mini editor de imágenes ---
const editorOpen = ref(false)
const editorTarget = ref(null) // { source: 'preview' } | { source: 'gallery', photoId }

function openEditorForPreview() {
  if (!preview.value) return
  editorTarget.value = { source: 'preview' }
  editorOpen.value = true
}

function openEditorForPhoto(photo) {
  if (!photo.url) return // no hay nada que editar sobre un placeholder
  editorTarget.value = { source: 'gallery', photoId: photo.id, url: photo.url }
  editorOpen.value = true
}

function onEditorSave(dataUrl) {
  if (editorTarget.value?.source === 'preview') {
    preview.value = { ...preview.value, url: dataUrl }
  } else if (editorTarget.value?.source === 'gallery') {
    emit('edit-photo', { photoId: editorTarget.value.photoId, url: dataUrl })
  }
  editorOpen.value = false
}

const editorImageUrl = () => {
  if (editorTarget.value?.source === 'preview') return preview.value?.url ?? ''
  return editorTarget.value?.url ?? ''
}

function pickFile() {
  fileInput.value?.click()
}

function handleFiles(files) {
  const file = files?.[0]
  if (!file) return
  // Convertimos a data URL (base64) para que la imagen persista al recargar.
  const reader = new FileReader()
  reader.onload = () => {
    preview.value = { url: reader.result, fileName: file.name }
  }
  reader.readAsDataURL(file)
}

function onInputChange(e) {
  handleFiles(e.target.files)
  e.target.value = '' // permite volver a elegir el mismo archivo
}

function onDrop(e) {
  isDragging.value = false
  handleFiles(e.dataTransfer.files)
}

function confirmUpload() {
  if (!preview.value) return
  emit('add-photo', {
    id: nextId(),
    description: description.value.trim() || 'Sin descripción',
    date: new Date().toISOString().slice(0, 10),
    url: preview.value.url,
  })
  // Reset del formulario de subida
  preview.value = null
  description.value = ''
}

function cancelUpload() {
  preview.value = null
  description.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Grid de la galería -->
    <div v-if="photos.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <figure
        v-for="(photo, i) in photos"
        :key="photo.id"
        class="group relative overflow-hidden rounded-xl bg-navy-50 shadow-card ring-1 ring-navy-900/5"
      >
        <div class="aspect-[4/3] overflow-hidden">
          <img
            v-if="photo.url"
            :src="photo.url"
            :alt="photo.description"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-gradient-to-br"
            :class="photoGradient(i)"
          >
            <svg class="h-7 w-7 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        </div>

        <!-- Editar / eliminar foto -->
        <div class="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            v-if="photo.url"
            class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-navy-500 shadow-sm backdrop-blur-sm transition-colors hover:text-solar-500"
            title="Editar foto"
            @click="openEditorForPhoto(photo)"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="m16.5 3.5 4 4L7 21l-4.5 1L3.5 17.5Z" />
            </svg>
          </button>
          <button
            class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-navy-500 shadow-sm backdrop-blur-sm transition-colors hover:text-rose-600"
            title="Eliminar foto"
            @click="emit('remove-photo', photo.id)"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
            </svg>
          </button>
        </div>

        <figcaption
          class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/75 to-transparent px-3 pb-2 pt-6"
        >
          <p class="truncate text-xs font-medium text-white">{{ photo.description }}</p>
          <p class="font-mono text-[10px] text-white/70">{{ formatDate(photo.date) }}</p>
        </figcaption>
      </figure>
    </div>

    <p v-else class="rounded-xl bg-white px-4 py-8 text-center text-sm text-navy-400 shadow-card ring-1 ring-navy-900/5">
      Aún no hay evidencias fotográficas para este proyecto.
    </p>

    <!-- Dropzone / subida simulada -->
    <div>
      <div
        v-if="!preview"
        class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors"
        :class="isDragging ? 'border-solar-400 bg-solar-50' : 'border-navy-200 bg-white/60'"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>
        <p class="text-sm text-navy-500">
          Arrastra una imagen o
          <button class="font-semibold text-solar-500 hover:underline" @click="pickFile">
            selecciona un archivo
          </button>
        </p>
        <p class="text-xs text-navy-400">PNG, JPG · evidencias, diagramas o mantenimiento</p>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onInputChange" />
      </div>

      <!-- Confirmación con descripción -->
      <div v-else class="rounded-xl bg-white p-4 shadow-card ring-1 ring-navy-900/5">
        <div class="flex items-start gap-3">
          <div class="relative flex-none">
            <img :src="preview.url" alt="preview" class="h-16 w-16 rounded-xl object-cover ring-1 ring-navy-100" />
            <button
              class="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-white shadow-sm transition-colors hover:bg-solar-400 hover:text-navy-900"
              title="Editar imagen"
              @click="openEditorForPreview"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="m16.5 3.5 4 4L7 21l-4.5 1L3.5 17.5Z" />
              </svg>
            </button>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-navy-700">{{ preview.fileName }}</p>
            <input
              v-model="description"
              type="text"
              placeholder="Describe la evidencia…"
              class="mt-2 w-full rounded-xl border-0 bg-navy-50 px-3 py-2 text-sm text-navy-700 ring-1 ring-navy-200 focus:outline-none focus:ring-2 focus:ring-solar-400"
            />
          </div>
        </div>
        <div class="mt-3 flex justify-end gap-2">
          <button
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-navy-500 hover:bg-navy-100"
            @click="cancelUpload"
          >
            Cancelar
          </button>
          <button
            class="rounded-lg bg-solar-400 px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-solar-300"
            @click="confirmUpload"
          >
            Adjuntar foto
          </button>
        </div>
      </div>
    </div>

    <!-- Mini editor de imágenes -->
    <ImageEditor
      :open="editorOpen"
      :image-url="editorImageUrl()"
      title="Editar evidencia"
      @close="editorOpen = false"
      @save="onEditorSave"
    />
  </div>
</template>
