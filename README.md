# Seguimiento y Control de Proyectos

Proyecto **Vue 3 + Vite + Tailwind CSS** con el módulo de Seguimiento y Control
listo para ejecutar. Incluye un dashboard de categorías de demo que abre el
módulo pasándole la categoría seleccionada.

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm 9+ (o pnpm/yarn)

## Arranque rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el servidor de desarrollo
npm run dev

# 3. Abrir la URL que muestra la consola (por defecto http://localhost:5173)
```

Otros comandos:

```bash
npm run build     # build de producción en /dist
npm run preview   # previsualizar el build
```

## Estructura

```
proyecto-seguimiento/
├─ index.html
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
└─ src/
   ├─ main.js
   ├─ style.css
   ├─ App.vue                        # Dashboard demo de categorías
   └─ seguimiento/                   # === EL MÓDULO (esto es lo que importas) ===
      ├─ SeguimientoProyectos.vue    # Componente principal
      ├─ components/
      │  ├─ ProjectCard.vue
      │  ├─ ProjectDetailDrawer.vue
      │  ├─ NewProjectModal.vue
      │  ├─ AlarmsPanel.vue
      │  ├─ PhotoGallery.vue
      │  ├─ TeamAvatars.vue
      │  └─ StatusBadge.vue
      └─ data/
         └─ mockData.js
```

## Integrar en tu plataforma existente

Copia la carpeta `src/seguimiento/` a tu proyecto e impórtala:

### Opción A — por prop

```vue
<script setup>
import SeguimientoProyectos from '@/seguimiento/SeguimientoProyectos.vue'
</script>

<template>
  <SeguimientoProyectos
    category-name="Cotizador EPC"
    @back="$router.push('/dashboard')"
    @project-created="onCreated"
    @project-updated="onUpdated"
  />
</template>
```

### Opción B — por ruta (Vue Router)

```js
{
  path: '/categoria/:categoryName/seguimiento',
  name: 'seguimiento',
  component: () => import('@/seguimiento/SeguimientoProyectos.vue'),
  props: true, // pasa :categoryName como prop automáticamente
}
```

## Props y eventos

| Prop           | Tipo             | Descripción                                       |
|----------------|------------------|---------------------------------------------------|
| `categoryName` | `String`         | Categoría activa (filtra los proyectos).          |
| `categoryId`   | `String\|Number` | Opcional.                                         |

| Evento             | Payload   | Cuándo                                    |
|--------------------|-----------|-------------------------------------------|
| `back`             | —         | Pulsar «Volver a categorías».             |
| `project-created`  | `project` | Se crea un proyecto.                      |
| `project-updated`  | `project` | Cambia el estado de un proyecto.         |

## Conectar a un backend real

Los datos viven en `src/seguimiento/data/mockData.js` y el estado se maneja
sobre una copia reactiva en `SeguimientoProyectos.vue`. Para producción,
reemplaza ese `ref(structuredClone(MOCK_PROJECTS))` por tu API o un store Pinia,
y usa los eventos emitidos para persistir.

> La subida de fotos es **simulada** (previsualización en el navegador con
> `URL.createObjectURL`). Para persistir, sube el `File` a tu almacenamiento y
> guarda la URL resultante en `photo.url`.
