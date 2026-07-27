<script setup>
import { ref, reactive, watch, computed, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  title: { type: String, default: 'Editar imagen' },
})

const emit = defineEmits(['close', 'save'])

// --- Lienzo ---
const canvasRef = ref(null)
const wrapRef = ref(null)
let ctx = null
let baseImage = null // HTMLImageElement cargada

// Historial para deshacer (guarda snapshots del canvas en su resolución real).
const history = ref([])
const MAX_HISTORY = 25

// --- Herramientas ---
const TOOLS = [
  { key: 'pen', label: 'Lápiz' },
  { key: 'line', label: 'Línea' },
  { key: 'arrow', label: 'Flecha' },
  { key: 'rect', label: 'Rectángulo' },
  { key: 'circle', label: 'Círculo' },
  { key: 'text', label: 'Texto' },
  { key: 'eraser', label: 'Borrador' },
]

const PALETTE = ['#e11d48', '#f5a524', '#22c55e', '#0ea5e9', '#7c3aed', '#0e1a2b', '#ffffff']

const state = reactive({
  tool: 'pen',
  color: '#e11d48',
  size: 5,
  loaded: false,
})

// Overlay para pedir texto al usar la herramienta "texto".
const textPrompt = reactive({ show: false, x: 0, y: 0, value: '' })

let drawing = false
let startX = 0
let startY = 0
let snapshotBeforeShape = null // imageData antes de iniciar una forma (para previsualizar sin acumular)

function loadImage(url) {
  state.loaded = false
  history.value = []
  const img = new Image()
  img.onload = () => {
    baseImage = img
    const canvas = canvasRef.value
    // Resolución interna = resolución real de la imagen (para exportar en buena calidad).
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    pushHistory()
    state.loaded = true
  }
  img.src = url
}

watch(
  () => props.open,
  (val) => {
    if (val && props.imageUrl) {
      state.tool = 'pen'
      state.color = '#e11d48'
      state.size = 5
      textPrompt.show = false
      loadImage(props.imageUrl)
    }
  },
)

function pushHistory() {
  const canvas = canvasRef.value
  if (!canvas) return
  history.value.push(canvas.toDataURL('image/png'))
  if (history.value.length > MAX_HISTORY) history.value.shift()
}

function undo() {
  if (history.value.length <= 1) return
  history.value.pop()
  const last = history.value[history.value.length - 1]
  const img = new Image()
  img.onload = () => {
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    ctx.drawImage(img, 0, 0)
  }
  img.src = last
}

function resetToOriginal() {
  if (!baseImage) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  ctx.drawImage(baseImage, 0, 0)
  pushHistory()
}

// --- Coordenadas: de píxeles de pantalla a resolución real del canvas ---
function getPos(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
}

function onPointerDown(e) {
  if (!state.loaded) return

  if (state.tool === 'text') {
    const canvas = canvasRef.value
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    textPrompt.show = true
    textPrompt.x = clientX - rect.left
    textPrompt.y = clientY - rect.top
    textPrompt.value = ''
    return
  }

  drawing = true
  const { x, y } = getPos(e)
  startX = x
  startY = y

  if (state.tool === 'pen' || state.tool === 'eraser') {
    ctx.beginPath()
    ctx.moveTo(x, y)
  } else {
    snapshotBeforeShape = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  }
}

function onPointerMove(e) {
  if (!drawing || !state.loaded) return
  const { x, y } = getPos(e)

  if (state.tool === 'pen' || state.tool === 'eraser') {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = state.size
    if (state.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = state.color
    }
    ctx.lineTo(x, y)
    ctx.stroke()
    return
  }

  // Formas: restaurar snapshot y previsualizar la forma en curso.
  if (snapshotBeforeShape) ctx.putImageData(snapshotBeforeShape, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = state.color
  ctx.fillStyle = state.color
  ctx.lineWidth = state.size
  ctx.lineCap = 'round'

  if (state.tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(x, y)
    ctx.stroke()
  } else if (state.tool === 'rect') {
    ctx.strokeRect(startX, startY, x - startX, y - startY)
  } else if (state.tool === 'circle') {
    const rx = Math.abs(x - startX) / 2
    const ry = Math.abs(y - startY) / 2
    const cx = (x + startX) / 2
    const cy = (y + startY) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (state.tool === 'arrow') {
    drawArrow(startX, startY, x, y)
  }
}

function drawArrow(x1, y1, x2, y2) {
  const headLen = Math.max(12, state.size * 3)
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 7), y2 - headLen * Math.sin(angle - Math.PI / 7))
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 7), y2 - headLen * Math.sin(angle + Math.PI / 7))
  ctx.closePath()
  ctx.fill()
}

function onPointerUp() {
  if (!drawing) return
  drawing = false
  ctx.globalCompositeOperation = 'source-over'
  snapshotBeforeShape = null
  pushHistory()
}

function commitText() {
  const val = textPrompt.value.trim()
  if (val) {
    const canvas = canvasRef.value
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const fontPx = Math.max(14, state.size * 5) * scaleX
    ctx.font = `700 ${fontPx}px 'Plus Jakarta Sans', sans-serif`
    ctx.fillStyle = state.color
    ctx.textBaseline = 'top'
    ctx.fillText(val, textPrompt.x * scaleX, textPrompt.y * (canvas.height / rect.height))
    pushHistory()
  }
  textPrompt.show = false
}

function cancelTextPrompt() {
  textPrompt.show = false
}

function save() {
  if (!canvasRef.value) return
  emit('save', canvasRef.value.toDataURL('image/png'))
}

const canUndo = computed(() => history.value.length > 1)

onBeforeUnmount(() => {
  ctx = null
  baseImage = null
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <Transition name="pop" appear>
          <div v-if="open" class="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <!-- Header -->
            <header class="relative flex items-center justify-between overflow-hidden bg-control px-6 py-4">
              <span class="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-solar-400/15 blur-2xl" />
              <div class="relative">
                <h2 class="font-display text-base font-bold text-white">{{ title }}</h2>
                <p class="mt-0.5 text-[11px] text-solar-300">Dibuja, resalta o anota sobre la imagen</p>
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

            <!-- Toolbar -->
            <div class="flex flex-wrap items-center gap-3 border-b border-navy-100 bg-navy-50/60 px-4 py-3">
              <!-- Herramientas -->
              <div class="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-navy-200">
                <button
                  v-for="t in TOOLS"
                  :key="t.key"
                  type="button"
                  class="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
                  :class="state.tool === t.key
                    ? 'bg-navy-800 text-white'
                    : 'text-navy-500 hover:bg-navy-100'"
                  :title="t.label"
                  @click="state.tool = t.key"
                >
                  {{ t.label }}
                </button>
              </div>

              <!-- Color -->
              <div class="flex items-center gap-1.5">
                <button
                  v-for="c in PALETTE"
                  :key="c"
                  type="button"
                  class="h-6 w-6 flex-none rounded-full ring-2 ring-offset-1 transition-transform hover:scale-110"
                  :class="state.color === c ? 'ring-solar-400' : 'ring-navy-200'"
                  :style="{ backgroundColor: c }"
                  @click="state.color = c"
                />
                <input v-model="state.color" type="color" class="h-6 w-6 flex-none cursor-pointer rounded-full border-0 bg-transparent p-0" />
              </div>

              <!-- Grosor -->
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Grosor</span>
                <input v-model.number="state.size" type="range" min="1" max="30" class="w-24 accent-solar-400" />
                <span class="w-6 text-right font-mono text-[11px] text-navy-500">{{ state.size }}</span>
              </div>

              <div class="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-navy-500 ring-1 ring-navy-200 transition-colors hover:bg-navy-100 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="!canUndo"
                  @click="undo"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 14 4 9l5-5" />
                    <path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5v0A5.5 5.5 0 0 1 14.5 20H11" />
                  </svg>
                  Deshacer
                </button>
                <button
                  type="button"
                  class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-500 ring-1 ring-rose-200 transition-colors hover:bg-rose-50"
                  @click="resetToOriginal"
                >
                  Borrar todo
                </button>
              </div>
            </div>

            <!-- Lienzo -->
            <div ref="wrapRef" class="relative flex max-h-[60vh] items-center justify-center overflow-auto bg-navy-100/60 p-4">
              <div class="relative inline-block">
                <canvas
                  ref="canvasRef"
                  class="max-h-[54vh] max-w-full touch-none rounded-lg bg-white shadow-card"
                  :class="{
                    'cursor-crosshair': state.tool !== 'text',
                    'cursor-text': state.tool === 'text',
                  }"
                  @mousedown="onPointerDown"
                  @mousemove="onPointerMove"
                  @mouseup="onPointerUp"
                  @mouseleave="onPointerUp"
                  @touchstart.prevent="onPointerDown"
                  @touchmove.prevent="onPointerMove"
                  @touchend.prevent="onPointerUp"
                />

                <!-- Input flotante para la herramienta de texto -->
                <div
                  v-if="textPrompt.show"
                  class="absolute z-10 flex items-center gap-1 rounded-lg bg-white p-1 shadow-xl ring-1 ring-navy-300"
                  :style="{ left: textPrompt.x + 'px', top: textPrompt.y + 'px' }"
                >
                  <input
                    v-model="textPrompt.value"
                    type="text"
                    autofocus
                    placeholder="Escribe y presiona Enter"
                    class="w-40 rounded-md bg-navy-50 px-2 py-1 text-xs text-navy-700 focus:outline-none"
                    @keyup.enter="commitText"
                    @keyup.esc="cancelTextPrompt"
                  />
                  <button class="rounded-md bg-solar-400 px-2 py-1 text-[11px] font-semibold text-navy-900" @click="commitText">
                    OK
                  </button>
                </div>

                <div v-if="!state.loaded" class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xs text-navy-400">Cargando imagen…</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <footer class="flex justify-end gap-2 border-t border-navy-100 bg-navy-50/50 px-6 py-4">
              <button class="rounded-xl px-4 py-2.5 text-sm font-medium text-navy-500 hover:bg-navy-100" @click="emit('close')">
                Cancelar
              </button>
              <button
                class="inline-flex items-center gap-2 rounded-xl bg-solar-400 px-4 py-2.5 text-sm font-semibold text-navy-900 shadow-solar transition-all hover:bg-solar-300 active:scale-[0.98]"
                @click="save"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Guardar cambios
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
</style>
