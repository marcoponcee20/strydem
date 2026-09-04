# STRYDE — roadmap

## Hecho
- Analítica avanzada (`src/lib/analytics.ts`): carga de sesión, CTL/ATL/TSB, ACWR, récords, logros, heatmap, export CSV.
- Caché de datos con react-query (`src/hooks/useWorkouts.ts`) para navegación instantánea.
- Heatmap de constancia (`src/components/ActivityHeatmap.tsx`).
- Buscador global ⌘K (`src/components/CommandPalette.tsx`).
- Página Récords y logros (`src/pages/Records.tsx`).
- Dashboard renovado: estado de forma, tendencia semanal, heatmap, skeletons.
- Eliminada la sección "Mi reloj" (Devices) a petición del usuario.

- Workouts: caché compartida, skeletons, buscador de texto y totales del filtro.
- NewWorkout invalida la caché al guardar.

## Pendiente
- Estadísticas: comparativas año contra año.
- Workouts: edición de sesiones existentes.
