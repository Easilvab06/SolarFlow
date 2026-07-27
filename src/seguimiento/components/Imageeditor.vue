<script setup>
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  title: { type: String, default: 'Editar imagen' },
})

const emit = defineEmits(['close', 'save'])

// --- Lienzo ---
const canvasRef = ref(null)
let ctx = null
let baseImage = null // HTMLImageElement cargada

// --- Modelo de elementos ---
// Cada anotación es un objeto independiente (texto, trazo, forma) que se puede
// seleccionar y mover después de creado, en lugar de quedar "quemado" en los
// píxeles del canvas.
const objects = ref([]) // lista de anotaciones activas
const selected = ref(null) // referencia al objeto seleccionado con la herramienta Mover
let idSeq = 0
const nextObjId = () => `obj_${Date.now()}_${idSeq++}`

// Historial (snapshots del arreglo de objetos) para deshacer.
const history = ref([])
const MAX_HISTORY = 30

// --- Herramientas ---
const TOOLS = [
  { key: 'move', label: 'Mover' },
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
const textPrompt = reactive({ show: false, screenX: 0, screenY: 0, canvasX: 0, canvasY: 0, value: '' })

let drawing = false
let dragging = false
const resizing = ref(false) // reactivo solo para reflejar el cursor durante el redimensionado
let resizeAnchor = null // { x, y } esquina opuesta al handle, fija durante el resize
let resizeOrigBox = null // { w, h } dimensiones originales (sin padding) al iniciar el resize
let resizeOrigObj = null // clon profundo del objeto antes de escalar
let lastX = 0
let lastY = 0
let activeStroke = null // trazo de lápiz/borrador en curso (ya está en objects.value)
let draft = null // forma (línea/flecha/rect/círculo) en curso, aún no confirmada

function loadImage(url) {
  state.loaded = false
  objects.value = []
  selected.value = null
  history.value = [[]]
  const img = new Image()
  img.onload = () => {
    baseImage = img
    const canvas = canvasRef.value
    // Resolución interna = resolución real de la imagen (para exportar en buena calidad).
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx = canvas.getContext('2d')
    state.loaded = true
    render()
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

// Si se cambia de herramienta, se pierde la selección activa.
watch(
  () => state.tool,
  () => {
    selected.value = null
    render()
  },
)

function pushHistory() {
  history.value.push(JSON.parse(JSON.stringify(objects.value)))
  if (history.value.length > MAX_HISTORY) history.value.shift()
}

function undo() {
  if (history.value.length <= 1) return
  history.value.pop()
  objects.value = JSON.parse(JSON.stringify(history.value[history.value.length - 1]))
  selected.value = null
  render()
}

function resetToOriginal() {
  objects.value = []
  selected.value = null
  pushHistory()
  render()
}

function deleteSelected() {
  if (!selected.value) return
  objects.value = objects.value.filter((o) => o.id !== selected.value.id)
  selected.value = null
  pushHistory()
  render()
}

// --- Coordenadas: de píxeles de pantalla a resolución real del canvas ---
function getPos(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY, rect }
}

// --- Cajas delimitadoras (para hit-test y el recuadro de selección) ---
function boundingBox(obj) {
  const pad = (obj.size || 8) + 8
  if (obj.type === 'text') {
    return { minX: obj.x - 4, minY: obj.y - 4, maxX: obj.x + obj.w + 4, maxY: obj.y + obj.h + 4 }
  }
  if (obj.type === 'pen' || obj.type === 'eraser') {
    const xs = obj.points.map((p) => p.x)
    const ys = obj.points.map((p) => p.y)
    return {
      minX: Math.min(...xs) - pad,
      minY: Math.min(...ys) - pad,
      maxX: Math.max(...xs) + pad,
      maxY: Math.max(...ys) + pad,
    }
  }
  // line, arrow, rect, circle
  return {
    minX: Math.min(obj.x1, obj.x2) - pad,
    minY: Math.min(obj.y1, obj.y2) - pad,
    maxX: Math.max(obj.x1, obj.x2) + pad,
    maxY: Math.max(obj.y1, obj.y2) + pad,
  }
}

// Caja "real" del objeto sin el padding usado para selección/hit-test — sirve
// como referencia exacta para calcular el factor de escala al redimensionar.
function rawBox(obj) {
  if (obj.type === 'text') {
    return { minX: obj.x, minY: obj.y, maxX: obj.x + obj.w, maxY: obj.y + obj.h }
  }
  if (obj.type === 'pen' || obj.type === 'eraser') {
    const xs = obj.points.map((p) => p.x)
    const ys = obj.points.map((p) => p.y)
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
  }
  return {
    minX: Math.min(obj.x1, obj.x2),
    minY: Math.min(obj.y1, obj.y2),
    maxX: Math.max(obj.x1, obj.x2),
    maxY: Math.max(obj.y1, obj.y2),
  }
}

function handleRadius() {
  return Math.max(16, canvasRef.value.width / 50)
}

// Recalcula la geometría de `target` a partir de `orig` (snapshot previo al
// arrastre) escalando desde la esquina ancla — nunca se pierde el trazo
// original porque siempre se parte del mismo snapshot, no de la última
// posición del frame anterior.
function applyResize(orig, scaleX, scaleY, anchorX, anchorY, target) {
  const sx = (v) => anchorX + (v - anchorX) * scaleX
  const sy = (v) => anchorY + (v - anchorY) * scaleY
  const avgScale = (scaleX + scaleY) / 2

  if (orig.type === 'text') {
    target.x = sx(orig.x)
    target.y = sy(orig.y)
    target.fontPx = Math.max(6, orig.fontPx * avgScale)
    target.w = orig.w * avgScale
    target.h = orig.h * avgScale
  } else if (orig.type === 'pen' || orig.type === 'eraser') {
    target.points = orig.points.map((p) => ({ x: sx(p.x), y: sy(p.y) }))
    target.size = Math.max(1, orig.size * avgScale)
  } else {
    target.x1 = sx(orig.x1)
    target.y1 = sy(orig.y1)
    target.x2 = sx(orig.x2)
    target.y2 = sy(orig.y2)
    target.size = Math.max(1, orig.size * avgScale)
  }
}

function hitTest(x, y) {
  for (let i = objects.value.length - 1; i >= 0; i--) {
    const box = boundingBox(objects.value[i])
    if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) return objects.value[i]
  }
  return null
}

function translateObject(obj, dx, dy) {
  if (obj.type === 'text') {
    obj.x += dx
    obj.y += dy
  } else if (obj.type === 'pen' || obj.type === 'eraser') {
    obj.points.forEach((p) => {
      p.x += dx
      p.y += dy
    })
  } else {
    obj.x1 += dx
    obj.y1 += dy
    obj.x2 += dx
    obj.y2 += dy
  }
}

// --- Dibujo ---
function drawArrowShape(x1, y1, x2, y2, size) {
  const headLen = Math.max(12, size * 3)
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

function drawObject(obj) {
  ctx.save()
  ctx.globalCompositeOperation = obj.type === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = obj.color
  ctx.fillStyle = obj.color
  ctx.lineWidth = obj.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (obj.type === 'pen' || obj.type === 'eraser') {
    if (obj.points.length) {
      ctx.beginPath()
      ctx.moveTo(obj.points[0].x, obj.points[0].y)
      obj.points.forEach((p) => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    }
  } else if (obj.type === 'line') {
    ctx.beginPath()
    ctx.moveTo(obj.x1, obj.y1)
    ctx.lineTo(obj.x2, obj.y2)
    ctx.stroke()
  } else if (obj.type === 'rect') {
    ctx.strokeRect(obj.x1, obj.y1, obj.x2 - obj.x1, obj.y2 - obj.y1)
  } else if (obj.type === 'circle') {
    const rx = Math.abs(obj.x2 - obj.x1) / 2
    const ry = Math.abs(obj.y2 - obj.y1) / 2
    const cx = (obj.x1 + obj.x2) / 2
    const cy = (obj.y1 + obj.y2) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (obj.type === 'arrow') {
    drawArrowShape(obj.x1, obj.y1, obj.x2, obj.y2, obj.size)
  } else if (obj.type === 'text') {
    ctx.font = `700 ${obj.fontPx}px 'Plus Jakarta Sans', sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(obj.text, obj.x, obj.y)
  }
  ctx.restore()
}

function render() {
  if (!ctx || !baseImage) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(baseImage, 0, 0)

  objects.value.forEach(drawObject)
  if (draft) drawObject(draft)

  if (selected.value && state.tool === 'move') {
    const box = boundingBox(selected.value)
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = '#2dd4bf'
    ctx.lineWidth = Math.max(2, canvasRef.value.width / 400)
    ctx.setLineDash([10, 6])
    ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY)
    ctx.restore()

    // Manija de redimensionar (esquina inferior derecha).
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.setLineDash([])
    const r = Math.max(8, canvasRef.value.width / 90)
    ctx.fillStyle = '#0e1a2b'
    ctx.strokeStyle = '#2dd4bf'
    ctx.lineWidth = Math.max(2, canvasRef.value.width / 300)
    ctx.beginPath()
    ctx.arc(box.maxX, box.maxY, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}

// --- Interacción ---
function onPointerDown(e) {
  if (!state.loaded) return
  const { x, y, rect } = getPos(e)

  if (state.tool === 'move') {
    // Si ya hay un elemento seleccionado, primero se revisa si el clic fue
    // sobre su manija de redimensionar (no altera la lógica de selección/mover).
    if (selected.value) {
      const box = boundingBox(selected.value)
      const r = handleRadius()
      if (Math.abs(x - box.maxX) <= r && Math.abs(y - box.maxY) <= r) {
        const raw = rawBox(selected.value)
        resizing.value = true
        resizeAnchor = { x: raw.minX, y: raw.minY }
        resizeOrigBox = {
          w: Math.max(1, raw.maxX - raw.minX),
          h: Math.max(1, raw.maxY - raw.minY),
        }
        resizeOrigObj = JSON.parse(JSON.stringify(selected.value))
        return
      }
    }

    const hit = hitTest(x, y)
    selected.value = hit
    dragging = !!hit
    lastX = x
    lastY = y
    render()
    return
  }

  if (state.tool === 'text') {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    textPrompt.show = true
    textPrompt.screenX = clientX - rect.left
    textPrompt.screenY = clientY - rect.top
    textPrompt.canvasX = x
    textPrompt.canvasY = y
    textPrompt.value = ''
    return
  }

  drawing = true

  if (state.tool === 'pen' || state.tool === 'eraser') {
    activeStroke = {
      id: nextObjId(),
      type: state.tool,
      points: [{ x, y }],
      color: state.color,
      size: state.size,
    }
    objects.value.push(activeStroke)
  } else {
    draft = { id: nextObjId(), type: state.tool, x1: x, y1: y, x2: x, y2: y, color: state.color, size: state.size }
  }
  render()
}

function onPointerMove(e) {
  if (!state.loaded) return

  if (state.tool === 'move') {
    if (resizing.value && selected.value && resizeOrigObj) {
      const { x, y } = getPos(e)
      const scaleX = Math.max(0.05, (x - resizeAnchor.x) / resizeOrigBox.w)
      const scaleY = Math.max(0.05, (y - resizeAnchor.y) / resizeOrigBox.h)
      applyResize(resizeOrigObj, scaleX, scaleY, resizeAnchor.x, resizeAnchor.y, selected.value)
      render()
      return
    }
    if (!dragging || !selected.value) return
    const { x, y } = getPos(e)
    translateObject(selected.value, x - lastX, y - lastY)
    lastX = x
    lastY = y
    render()
    return
  }

  if (!drawing) return
  const { x, y } = getPos(e)

  if (activeStroke) {
    activeStroke.points.push({ x, y })
  } else if (draft) {
    draft.x2 = x
    draft.y2 = y
  }
  render()
}

function onPointerUp() {
  if (state.tool === 'move') {
    if (resizing.value) {
      resizing.value = false
      resizeAnchor = null
      resizeOrigBox = null
      resizeOrigObj = null
      pushHistory()
      return
    }
    if (dragging) pushHistory()
    dragging = false
    return
  }

  if (!drawing) return
  drawing = false

  if (activeStroke) {
    activeStroke = null
    pushHistory()
  } else if (draft) {
    objects.value.push(draft)
    draft = null
    pushHistory()
  }
}

function commitText() {
  const val = textPrompt.value.trim()
  if (val) {
    const canvas = canvasRef.value
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const fontPx = Math.max(14, state.size * 5) * scaleX
    ctx.font = `700 ${fontPx}px 'Plus Jakarta Sans', sans-serif`
    const w = ctx.measureText(val).width

    const obj = {
      id: nextObjId(),
      type: 'text',
      x: textPrompt.canvasX,
      y: textPrompt.canvasY,
      text: val,
      color: state.color,
      fontPx,
      w,
      h: fontPx,
    }
    objects.value.push(obj)
    pushHistory()

    // Cambia a la herramienta Mover con el texto recién creado seleccionado,
    // para que se pueda reubicar de inmediato si no quedó en el lugar ideal.
    state.tool = 'move'
    selected.value = obj
  }
  textPrompt.show = false
  render()
}

function cancelTextPrompt() {
  textPrompt.show = false
}

function onKeydown(e) {
  if (!props.open) return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.tool === 'move' && selected.value) {
    e.preventDefault()
    deleteSelected()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

function save() {
  if (!canvasRef.value) return
  selected.value = null
  render()
  emit('save', canvasRef.value.toDataURL('image/png'))
}

function download() {
  if (!canvasRef.value) return
  selected.value = null
  render()
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  link.download = `evidencia-editada-${stamp}.png`
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()
}

const canUndo = computed(() => history.value.length > 1)

const cursorClass = computed(() => {
  if (resizing.value) return 'cursor-nwse-resize'
  if (state.tool === 'move') return 'cursor-move'
  if (state.tool === 'text') return 'cursor-text'
  return 'cursor-crosshair'
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
                <p class="mt-0.5 text-[11px] text-solar-300">
                  Dibuja, resalta o anota — usa "Mover" para reubicar cualquier elemento
                </p>
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
                  class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
                  :class="state.tool === t.key
                    ? 'bg-navy-800 text-white'
                    : 'text-navy-500 hover:bg-navy-100'"
                  :title="t.label"
                  @click="state.tool = t.key"
                >
                  <svg v-if="t.key === 'move'" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 3v18M3 12h18M6 6l-3 6 3 6M18 6l3 6-3 6M6 18l6 3 6-3M6 6l6-3 6 3" />
                  </svg>
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
                  v-if="state.tool === 'move' && selected"
                  type="button"
                  class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-500 ring-1 ring-rose-200 transition-colors hover:bg-rose-50"
                  @click="deleteSelected"
                >
                  Eliminar elemento
                </button>
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

            <p v-if="state.tool === 'move'" class="bg-teal-50 px-4 py-1.5 text-center text-[11px] font-medium text-teal-700">
              Arrastra un elemento para moverlo · arrastra el punto teal de la esquina para agrandarlo o reducirlo · Supr para eliminarlo
            </p>

            <!-- Lienzo -->
            <div class="relative flex max-h-[60vh] items-center justify-center overflow-auto bg-navy-100/60 p-4">
              <div class="relative inline-block">
                <canvas
                  ref="canvasRef"
                  class="max-h-[54vh] max-w-full touch-none rounded-lg bg-white shadow-card"
                  :class="cursorClass"
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
                  :style="{ left: textPrompt.screenX + 'px', top: textPrompt.screenY + 'px' }"
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
            <footer class="flex items-center justify-end gap-2 border-t border-navy-100 bg-navy-50/50 px-6 py-4">
              <button class="rounded-xl px-4 py-2.5 text-sm font-medium text-navy-500 hover:bg-navy-100" @click="emit('close')">
                Cancelar
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 shadow-card ring-1 ring-navy-200 transition-colors hover:bg-navy-50"
                @click="download"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 4v11m0 0 4-4m-4 4-4-4" />
                  <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
                </svg>
                Descargar
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