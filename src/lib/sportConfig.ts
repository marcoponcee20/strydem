// Sport-specific configuration: which fields apply to each sport,
// labels, units, icons, and helpers to format/derive metrics.
import {
  Activity, Bike, Waves, Mountain, Dumbbell, Footprints, Trophy, Snowflake, Heart,
  type LucideIcon,
} from "lucide-react";

export type SportKey =
  | "running"
  | "trail"
  | "ciclismo"
  | "natación"
  | "gym"
  | "trekking"
  | "fútbol"
  | "esquí"
  | "yoga"
  | "otros";

export const SPORTS: SportKey[] = [
  "running", "trail", "ciclismo", "natación", "gym", "trekking", "fútbol", "esquí", "yoga", "otros",
];

export const SPORT_LABEL: Record<SportKey, string> = {
  running: "Running",
  trail: "Trail",
  ciclismo: "Ciclismo",
  "natación": "Natación",
  gym: "Gimnasio",
  trekking: "Trekking",
  "fútbol": "Fútbol",
  "esquí": "Esquí",
  yoga: "Yoga",
  otros: "Otros",
};

export const SPORT_ICON: Record<SportKey, LucideIcon> = {
  running: Footprints,
  trail: Mountain,
  ciclismo: Bike,
  "natación": Waves,
  gym: Dumbbell,
  trekking: Mountain,
  "fútbol": Trophy,
  "esquí": Snowflake,
  yoga: Heart,
  otros: Activity,
};

// Which standard columns matter for each sport
type Std = "distance" | "duration" | "pace" | "speed" | "hr" | "elevation" | "calories" | "effort";

export const SPORT_FIELDS: Record<SportKey, Std[]> = {
  running:    ["distance", "duration", "pace",  "hr", "elevation", "calories", "effort"],
  trail:      ["distance", "duration", "pace",  "hr", "elevation", "calories", "effort"],
  ciclismo:   ["distance", "duration", "speed", "hr", "elevation", "calories", "effort"],
  "natación": ["distance", "duration",          "hr",              "calories", "effort"],
  gym:        [             "duration",         "hr",              "calories", "effort"],
  trekking:   ["distance", "duration",          "hr", "elevation", "calories", "effort"],
  "fútbol":   [             "duration",         "hr",              "calories", "effort"],
  "esquí":    ["distance", "duration",          "hr", "elevation", "calories", "effort"],
  yoga:       [             "duration",         "hr",              "calories", "effort"],
  otros:      ["distance", "duration",          "hr", "elevation", "calories", "effort"],
};

// Sport-specific extra fields stored in workouts.extras (jsonb)
export type ExtraField = {
  key: string;
  label: string;
  unit?: string;
  type: "number" | "text";
  step?: string;
};

export const SPORT_EXTRAS: Record<SportKey, ExtraField[]> = {
  running:    [{ key: "cadence", label: "Cadencia", unit: "ppm", type: "number" }],
  trail:      [
    { key: "terrain", label: "Terreno", type: "text" },
    { key: "tech_level", label: "Dificultad técnica (1-5)", type: "number" },
  ],
  ciclismo:   [
    { key: "avg_power_w", label: "Potencia media", unit: "W", type: "number" },
    { key: "cadence_rpm", label: "Cadencia", unit: "rpm", type: "number" },
    { key: "bike", label: "Bici / setup", type: "text" },
  ],
  "natación": [
    { key: "pool_length_m", label: "Largo de piscina", unit: "m", type: "number" },
    { key: "stroke", label: "Estilo (libre, espalda...)", type: "text" },
    { key: "strokes_per_length", label: "Brazadas / largo", type: "number" },
    { key: "swolf", label: "SWOLF", type: "number" },
  ],
  gym: [
    { key: "muscle_groups", label: "Grupos musculares", type: "text" },
    { key: "total_sets", label: "Series totales", type: "number" },
    { key: "total_reps", label: "Reps totales", type: "number" },
    { key: "max_weight_kg", label: "Peso máx. levantado", unit: "kg", type: "number", step: "0.5" },
    { key: "total_volume_kg", label: "Volumen total (kg·reps)", unit: "kg", type: "number" },
  ],
  trekking: [
    { key: "route", label: "Ruta", type: "text" },
    { key: "pack_kg", label: "Peso mochila", unit: "kg", type: "number", step: "0.1" },
  ],
  "fútbol": [
    { key: "position", label: "Posición", type: "text" },
    { key: "goals", label: "Goles", type: "number" },
    { key: "assists", label: "Asistencias", type: "number" },
    { key: "match_result", label: "Resultado", type: "text" },
  ],
  "esquí": [
    { key: "discipline", label: "Modalidad (alpino, fondo...)", type: "text" },
    { key: "runs", label: "Bajadas", type: "number" },
    { key: "snow", label: "Estado de nieve", type: "text" },
  ],
  yoga: [
    { key: "style", label: "Estilo (vinyasa, hatha...)", type: "text" },
    { key: "difficulty", label: "Dificultad (1-5)", type: "number" },
  ],
  otros: [],
};

export function hasField(sport: string, field: Std): boolean {
  const k = (sport as SportKey) in SPORT_FIELDS ? (sport as SportKey) : "otros";
  return SPORT_FIELDS[k].includes(field);
}

export function sportLabel(sport: string): string {
  return SPORT_LABEL[(sport as SportKey)] ?? sport;
}

export function sportIcon(sport: string): LucideIcon {
  return SPORT_ICON[(sport as SportKey)] ?? Activity;
}

export function getExtras(sport: string): ExtraField[] {
  return SPORT_EXTRAS[(sport as SportKey)] ?? [];
}

// ----- Formatting helpers -----

export function formatSpeedKmh(distanceKm?: number | null, durationSec?: number | null): string {
  if (!distanceKm || !durationSec || durationSec <= 0) return "—";
  const kmh = (distanceKm / (durationSec / 3600));
  return `${kmh.toFixed(1)} km/h`;
}

export function formatPace100m(distanceKm?: number | null, durationSec?: number | null): string {
  if (!distanceKm || !durationSec || durationSec <= 0) return "—";
  const secPer100 = durationSec / (distanceKm * 10);
  const m = Math.floor(secPer100 / 60);
  const s = Math.round(secPer100 % 60);
  return `${m}:${s.toString().padStart(2, "0")}/100m`;
}

// Returns the most relevant secondary metric for a sport, used in lists/cards.
export function primaryDistanceLabel(sport: string): string {
  if (sport === "natación") return "Distancia";
  if (sport === "gym" || sport === "yoga" || sport === "fútbol") return "Sesión";
  return "Distancia";
}

export function formatPrimaryDistance(sport: string, w: { distance_km?: number | null; duration_seconds?: number | null }): string {
  if (sport === "natación" && w.distance_km) return `${(Number(w.distance_km) * 1000).toFixed(0)} m`;
  if (w.distance_km) return `${Number(w.distance_km).toFixed(2)} km`;
  return "—";
}

export function formatTempo(sport: string, w: { distance_km?: number | null; duration_seconds?: number | null; pace_seconds_per_km?: number | null }): { label: string; value: string } {
  if (sport === "ciclismo" || sport === "esquí") {
    return { label: "Velocidad", value: formatSpeedKmh(w.distance_km, w.duration_seconds) };
  }
  if (sport === "natación") {
    return { label: "Ritmo", value: formatPace100m(w.distance_km, w.duration_seconds) };
  }
  return { label: "Ritmo", value: w.pace_seconds_per_km ? formatPaceMinKm(w.pace_seconds_per_km) : "—" };
}

function formatPaceMinKm(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}
