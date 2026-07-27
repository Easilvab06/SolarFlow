// data/mockData.js
// -----------------------------------------------------------------------------
// Catálogos, helpers y datos simulados para el módulo de Seguimiento y Control.
// Todo es 100% front (sin dependencias) para poder probar la UI de inmediato.
// -----------------------------------------------------------------------------

/**
 * Catálogo de estados del pipeline.
 * `badge`, `dot` y `text` son clases Tailwind para pintar el estado de forma
 * consistente en toda la interfaz.
 */
export const STATUSES = {
  pendiente: {
    key: 'pendiente',
    label: 'Pendiente',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  },
  ejecucion: {
    key: 'ejecucion',
    label: 'En operación',
    dot: 'bg-sky-500',
    text: 'text-sky-600',
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  },
  revision: {
    key: 'revision',
    label: 'En revisión',
    dot: 'bg-violet-500',
    text: 'text-violet-600',
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  },
  completado: {
    key: 'completado',
    label: 'Completado',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  detenido: {
    key: 'detenido',
    label: 'Detenido',
    dot: 'bg-rose-500',
    text: 'text-rose-600',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  },
}

/** Lista ordenada para poblar selects / filtros. */
export const STATUS_LIST = Object.values(STATUSES)

/**
 * Niveles de alarma. Se usa el mismo catálogo para filtros, badges y el panel.
 */
export const ALARM_LEVELS = {
  none: {
    key: 'none',
    label: 'Sin alertas',
    dot: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    ring: 'ring-slate-200',
  },
  amarilla: {
    key: 'amarilla',
    label: 'Alerta media',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    ring: 'ring-amber-200',
  },
  roja: {
    key: 'roja',
    label: 'Alerta crítica',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    ring: 'ring-rose-200',
  },
}

export const ALARM_LEVEL_LIST = Object.values(ALARM_LEVELS)

// --- Helpers -----------------------------------------------------------------

/** Devuelve las iniciales (máx. 2) a partir de un nombre completo. */
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_PALETTE = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-indigo-100 text-indigo-700',
]

/** Color estable (determinístico) para el avatar según el nombre. */
export function avatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

/** Gradientes pastel para simular miniaturas de fotos sin cargar recursos. */
const PHOTO_GRADIENTS = [
  'from-sky-200 to-indigo-200',
  'from-amber-200 to-rose-200',
  'from-emerald-200 to-teal-200',
  'from-violet-200 to-fuchsia-200',
  'from-rose-200 to-orange-200',
  'from-cyan-200 to-blue-200',
]
export function photoGradient(seed = 0) {
  return PHOTO_GRADIENTS[seed % PHOTO_GRADIENTS.length]
}

/** Código de proyecto tipo instrumento: 42 -> "PRJ-0042". */
export function projectCode(id = 0) {
  const n = Math.abs(Number(id) % 10000)
  return 'PRJ-' + String(n).padStart(4, '0')
}

/** Formatea 'YYYY-MM-DD' a algo legible: '04 nov 2025'. */
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function formatDate(iso = '') {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso || '—'
  return `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}

// ID único global: combina el timestamp con un contador incremental para que
// no colisione con los IDs de ejemplo ni entre recargas de la página.
let _seq = 0
export const nextId = () => Date.now() * 1000 + (_seq++ % 1000)

// --- Datos simulados ----------------------------------------------------------
// Cada proyecto está etiquetado con `category` para que el módulo filtre según
// la categoría recibida por prop/ruta. Los nombres coinciden con tu dashboard.

export const MOCK_PROJECTS = [
  {
    id: 1,
    name: 'Planta Solar Sogamoso 2.4 MW',
    client: 'AgroEnergía del Valle',
    location: 'Sogamoso, Boyacá',
    category: 'Cotizador EPC',
    status: 'ejecucion',
    progress: 62,
    alarmLevel: 'roja',
    dates: { start: '2025-11-04', end: '2026-08-30' },
    team: [
      { name: 'Laura Beltrán', role: 'Líder de proyecto' },
      { name: 'Carlos Rincón', role: 'Ingeniero eléctrico' },
      { name: 'Mónica Silva', role: 'HSE' },
    ],
    photos: [
      { id: 11, description: 'Montaje de estructura fija', date: '2026-06-02' },
      { id: 12, description: 'Cableado DC string 1', date: '2026-06-18' },
      { id: 13, description: 'Inversor central instalado', date: '2026-07-05' },
    ],
    alarms: [
      { id: 101, level: 'roja', title: 'Retraso crítico en interconexión', description: 'La aprobación del operador de red lleva 12 días de atraso.', date: '2026-07-15', resolved: false },
      { id: 102, level: 'amarilla', title: 'Entrega de módulos próxima', description: 'Segundo lote de paneles llega en 5 días.', date: '2026-07-19', resolved: false },
    ],
  },
  {
    id: 2,
    name: 'Cubierta Industrial Duitama 800 kW',
    client: 'Textiles Andinos S.A.',
    location: 'Duitama, Boyacá',
    category: 'Cotizador EPC',
    status: 'revision',
    progress: 88,
    alarmLevel: 'amarilla',
    dates: { start: '2025-09-12', end: '2026-07-28' },
    team: [
      { name: 'Andrés Gómez', role: 'Líder de proyecto' },
      { name: 'Paula Torres', role: 'Diseño' },
    ],
    photos: [
      { id: 21, description: 'Inspección de cubierta', date: '2026-05-20' },
      { id: 22, description: 'String box tablero AC', date: '2026-06-30' },
    ],
    alarms: [
      { id: 201, level: 'amarilla', title: 'Acta de entrega pendiente', description: 'Falta firma del cliente para cierre.', date: '2026-07-17', resolved: false },
    ],
  },
  {
    id: 3,
    name: 'O&M Portafolio Comercial Tunja',
    client: 'Centro Comercial Unicentro',
    location: 'Tunja, Boyacá',
    category: 'Mantenimiento General',
    status: 'ejecucion',
    progress: 45,
    alarmLevel: 'roja',
    dates: { start: '2026-01-10', end: '2026-12-31' },
    team: [
      { name: 'Diego Fonseca', role: 'Supervisor O&M' },
      { name: 'Sara Quintero', role: 'Técnica' },
    ],
    photos: [
      { id: 31, description: 'Termografía tablero AC', date: '2026-06-11' },
      { id: 32, description: 'Limpieza de módulos zona A', date: '2026-06-25' },
    ],
    alarms: [
      { id: 301, level: 'roja', title: 'Mantenimiento preventivo vencido', description: 'Ciclo trimestral del inversor 2 vencido hace 8 días.', date: '2026-07-13', resolved: false },
    ],
  },
  {
    id: 4,
    name: 'Correctivo Inversor SMA — Paipa',
    client: 'Hotel Termales',
    location: 'Paipa, Boyacá',
    category: 'Mantenimiento General',
    status: 'completado',
    progress: 100,
    alarmLevel: 'none',
    dates: { start: '2026-05-02', end: '2026-05-20' },
    team: [{ name: 'Julián Mora', role: 'Técnico especialista' }],
    photos: [{ id: 41, description: 'Reemplazo de ventilador', date: '2026-05-14' }],
    alarms: [],
  },
  {
    id: 5,
    name: 'Estación de Carga DC 150 kW',
    client: 'Movilidad Boyacá',
    location: 'Sogamoso, Boyacá',
    category: 'EDC',
    status: 'pendiente',
    progress: 8,
    alarmLevel: 'amarilla',
    dates: { start: '2026-08-01', end: '2027-02-15' },
    team: [
      { name: 'Natalia Rojas', role: 'Líder de proyecto' },
      { name: 'Felipe Cárdenas', role: 'Obra civil' },
    ],
    photos: [{ id: 51, description: 'Levantamiento topográfico', date: '2026-07-08' }],
    alarms: [
      { id: 501, level: 'amarilla', title: 'Licencia de obra próxima a vencer', description: 'Radicación ante alcaldía vence en 9 días.', date: '2026-07-20', resolved: false },
    ],
  },
  {
    id: 6,
    name: 'Corredor de Carga Ruta 55',
    client: 'Transporte Verde',
    location: 'Corredor Tunja–Sogamoso',
    category: 'EDC',
    status: 'detenido',
    progress: 30,
    alarmLevel: 'roja',
    dates: { start: '2025-12-01', end: '2026-10-30' },
    team: [{ name: 'Óscar Peña', role: 'Coordinador' }],
    photos: [],
    alarms: [
      { id: 601, level: 'roja', title: 'Suministro de cargadores detenido', description: 'Proveedor sin fecha de entrega confirmada.', date: '2026-07-10', resolved: false },
    ],
  },
  {
    id: 7,
    name: 'Interventoría Granja Solar 5 MW',
    client: 'Fondo de Energía Renovable',
    location: 'Nobsa, Boyacá',
    category: 'Interventoría y Consultoría',
    status: 'ejecucion',
    progress: 54,
    alarmLevel: 'none',
    dates: { start: '2026-02-20', end: '2027-01-15' },
    team: [
      { name: 'Camila Vega', role: 'Interventora' },
      { name: 'Ricardo Álvarez', role: 'Auditor técnico' },
    ],
    photos: [{ id: 71, description: 'Verificación de torque', date: '2026-06-28' }],
    alarms: [],
  },
]
