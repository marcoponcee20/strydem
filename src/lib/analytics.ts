// Advanced training analytics: load, fitness/fatigue/form, records, badges.
import { hasField } from "@/lib/sportConfig";

export interface WorkoutRow {
  id: string;
  workout_date: string;
  title: string | null;
  sport: string;
  distance_km: number | null;
  duration_seconds: number | null;
  pace_seconds_per_km: number | null;
  avg_heart_rate: number | null;
  elevation_gain_m?: number | null;
  calories?: number | null;
  perceived_effort?: number | null;
  notes?: string | null;
  extras?: Record<string, any> | null;
}

export const dayKey = (d: string | Date) =>
  (typeof d === "string" ? new Date(d) : d).toISOString().slice(0, 10);

/**
 * Training load for a session (arbitrary but consistent units, ~TSS-like).
 * Uses RPE when available, else heart-rate intensity, else a sport factor.
 */
export function sessionLoad(w: WorkoutRow, maxHr?: number | null, restHr?: number | null): number {
  const minutes = (w.duration_seconds || 0) / 60;
  if (minutes <= 0) return 0;

  let intensity = 0.6; // default moderate
  if (w.perceived_effort && w.perceived_effort > 0) {
    intensity = Math.min(1, w.perceived_effort / 10);
  } else if (w.avg_heart_rate && maxHr && maxHr > 60) {
    const rest = restHr && restHr > 30 ? restHr : 60;
    intensity = Math.min(1, Math.max(0.3, (w.avg_heart_rate - rest) / (maxHr - rest)));
  } else {
    const f: Record<string, number> = { running: 0.72, trail: 0.75, ciclismo: 0.6, "natación": 0.7, gym: 0.6, trekking: 0.5, "fútbol": 0.75, "esquí": 0.6, yoga: 0.35 };
    intensity = f[w.sport] ?? 0.6;
  }
  // quadratic weighting rewards intensity, like TRIMP/TSS
  return Math.round(minutes * intensity * intensity * 1.9);
}

export interface LoadPoint {
  date: string;
  label: string;
  load: number;
  ctl: number; // fitness (42d)
  atl: number; // fatigue (7d)
  tsb: number; // form
}

/** Daily CTL/ATL/TSB series for the last `days` days. */
export function buildLoadSeries(workouts: WorkoutRow[], days = 120, maxHr?: number | null, restHr?: number | null): LoadPoint[] {
  const perDay = new Map<string, number>();
  for (const w of workouts) {
    const k = dayKey(w.workout_date);
    perDay.set(k, (perDay.get(k) || 0) + sessionLoad(w, maxHr, restHr));
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1 + 42)); // warm-up window

  let ctl = 0, atl = 0;
  const out: LoadPoint[] = [];
  const cursor = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (cursor <= today) {
    const k = dayKey(cursor);
    const load = perDay.get(k) || 0;
    ctl = ctl + (load - ctl) / 42;
    atl = atl + (load - atl) / 7;
    out.push({
      date: k,
      label: cursor.toLocaleDateString("es", { day: "numeric", month: "short" }),
      load,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out.slice(-days);
}

export function formStatus(tsb: number): { label: string; tone: "good" | "warn" | "bad" | "neutral"; hint: string } {
  if (tsb > 15) return { label: "Fresco", tone: "good", hint: "Estás descansado: buen momento para competir o meter una sesión de calidad." };
  if (tsb > 5) return { label: "En forma", tone: "good", hint: "Equilibrio ideal entre carga y descanso." };
  if (tsb > -10) return { label: "Productivo", tone: "neutral", hint: "Estás construyendo forma física. Mantén la constancia." };
  if (tsb > -25) return { label: "Cargado", tone: "warn", hint: "Fatiga alta. Vigila el descanso y la alimentación." };
  return { label: "Sobrecargado", tone: "bad", hint: "Riesgo de sobreentrenamiento: mete días fáciles o descanso." };
}

/** Acute:Chronic Workload Ratio — sweet spot 0.8–1.3 */
export function acwr(series: LoadPoint[]): number | null {
  const last = series[series.length - 1];
  if (!last || last.ctl <= 0) return null;
  return Math.round((last.atl / last.ctl) * 100) / 100;
}

// ---------- Heatmap ----------
export interface HeatDay { date: string; count: number; km: number; minutes: number }

export function buildHeatmap(workouts: WorkoutRow[], weeks = 27): HeatDay[] {
  const map = new Map<string, HeatDay>();
  for (const w of workouts) {
    const k = dayKey(w.workout_date);
    const cur = map.get(k) || { date: k, count: 0, km: 0, minutes: 0 };
    cur.count += 1;
    cur.km += Number(w.distance_km) || 0;
    cur.minutes += (w.duration_seconds || 0) / 60;
    map.set(k, cur);
  }
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  // walk back to the Monday of the first displayed week
  const start = new Date(end);
  start.setDate(end.getDate() - (weeks * 7 - 1));
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const out: HeatDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const k = dayKey(cursor);
    out.push(map.get(k) || { date: k, count: 0, km: 0, minutes: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// ---------- Records ----------
export interface RecordItem { label: string; value: string; sub?: string; date?: string }

const fmtPace = (s: number) => `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, "0")}/km`;
const fmtDur = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
};

export function sportRecords(workouts: WorkoutRow[], sport: string): RecordItem[] {
  const rows = workouts.filter((w) => w.sport === sport);
  if (rows.length === 0) return [];
  const recs: RecordItem[] = [];

  const byMax = (fn: (w: WorkoutRow) => number) =>
    rows.reduce<{ w: WorkoutRow | null; v: number }>((acc, w) => {
      const v = fn(w) || 0;
      return v > acc.v ? { w, v } : acc;
    }, { w: null, v: 0 });

  if (hasField(sport, "distance")) {
    const d = byMax((w) => Number(w.distance_km) || 0);
    if (d.w) recs.push({
      label: "Distancia más larga",
      value: sport === "natación" ? `${(d.v * 1000).toFixed(0)} m` : `${d.v.toFixed(2)} km`,
      date: d.w.workout_date,
    });
  }

  const t = byMax((w) => w.duration_seconds || 0);
  if (t.w) recs.push({ label: "Sesión más larga", value: fmtDur(t.v), date: t.w.workout_date });

  if (hasField(sport, "pace")) {
    const best = rows
      .filter((w) => (w.pace_seconds_per_km || 0) > 0 && (Number(w.distance_km) || 0) >= 1)
      .sort((a, b) => (a.pace_seconds_per_km || 0) - (b.pace_seconds_per_km || 0))[0];
    if (best) recs.push({ label: "Mejor ritmo medio", value: fmtPace(best.pace_seconds_per_km!), sub: `${Number(best.distance_km).toFixed(1)} km`, date: best.workout_date });
  }

  if (hasField(sport, "speed")) {
    const best = rows
      .filter((w) => (Number(w.distance_km) || 0) > 0 && (w.duration_seconds || 0) > 0)
      .sort((a, b) => (Number(b.distance_km)! / b.duration_seconds!) - (Number(a.distance_km)! / a.duration_seconds!))[0];
    if (best) recs.push({ label: "Mejor velocidad media", value: `${(Number(best.distance_km) / (best.duration_seconds! / 3600)).toFixed(1)} km/h`, date: best.workout_date });
  }

  if (hasField(sport, "elevation")) {
    const e = byMax((w) => Number(w.elevation_gain_m) || 0);
    if (e.w && e.v > 0) recs.push({ label: "Mayor desnivel positivo", value: `${e.v.toFixed(0)} m+`, date: e.w.workout_date });
  }

  const hr = byMax((w) => w.avg_heart_rate || 0);
  if (hr.w && hr.v > 0) recs.push({ label: "FC media más alta", value: `${hr.v} bpm`, date: hr.w.workout_date });

  if (sport === "gym") {
    const pw = byMax((w) => Number(w.extras?.max_weight_kg) || 0);
    if (pw.w && pw.v > 0) recs.push({ label: "Peso máximo levantado", value: `${pw.v} kg`, date: pw.w.workout_date });
    const vol = byMax((w) => Number(w.extras?.total_volume_kg) || 0);
    if (vol.w && vol.v > 0) recs.push({ label: "Mayor volumen", value: `${vol.v.toFixed(0)} kg`, date: vol.w.workout_date });
  }
  if (sport === "ciclismo") {
    const p = byMax((w) => Number(w.extras?.avg_power_w) || 0);
    if (p.w && p.v > 0) recs.push({ label: "Potencia media máxima", value: `${p.v} W`, date: p.w.workout_date });
  }

  return recs;
}

/** Best "estimated" times for classic running distances, from average pace. */
export function runningMilestones(workouts: WorkoutRow[]): RecordItem[] {
  const targets = [
    { km: 5, label: "5 km" },
    { km: 10, label: "10 km" },
    { km: 21.097, label: "Media maratón" },
    { km: 42.195, label: "Maratón" },
  ];
  const runs = workouts.filter((w) => (w.sport === "running" || w.sport === "trail") && (Number(w.distance_km) || 0) > 0 && (w.duration_seconds || 0) > 0);
  return targets.map((t) => {
    const valid = runs.filter((w) => Number(w.distance_km) >= t.km * 0.97);
    if (valid.length === 0) return { label: t.label, value: "—", sub: "Aún sin registro" };
    const best = valid.sort((a, b) => (a.duration_seconds! / Number(a.distance_km)) - (b.duration_seconds! / Number(b.distance_km)))[0];
    const secs = (best.duration_seconds! / Number(best.distance_km)) * t.km;
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.round(secs % 60);
    return {
      label: t.label,
      value: h ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`,
      sub: `Ritmo ${fmtPace(best.duration_seconds! / Number(best.distance_km))}`,
      date: best.workout_date,
    };
  });
}

// ---------- Badges ----------
export interface Badge { id: string; name: string; desc: string; earned: boolean; progress: number; target: number; unit: string }

export function computeBadges(workouts: WorkoutRow[], streak: number): Badge[] {
  const totalKm = workouts.reduce((s, w) => s + (hasField(w.sport, "distance") ? Number(w.distance_km) || 0 : 0), 0);
  const totalHours = workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0) / 3600;
  const sports = new Set(workouts.map((w) => w.sport)).size;
  const elevation = workouts.reduce((s, w) => s + (Number(w.elevation_gain_m) || 0), 0);
  const longest = workouts.reduce((m, w) => Math.max(m, Number(w.distance_km) || 0), 0);
  const earlyBirds = workouts.filter((w) => new Date(w.workout_date).getHours() < 7).length;

  const mk = (id: string, name: string, desc: string, progress: number, target: number, unit: string): Badge => ({
    id, name, desc, progress: Math.min(progress, target), target, unit, earned: progress >= target,
  });

  return [
    mk("first", "Primer paso", "Registra tu primer entrenamiento", workouts.length, 1, "sesión"),
    mk("ten", "Constancia", "Completa 10 sesiones", workouts.length, 10, "sesiones"),
    mk("fifty", "Veterano", "Completa 50 sesiones", workouts.length, 50, "sesiones"),
    mk("century", "Club de los 100", "Acumula 100 km", totalKm, 100, "km"),
    mk("k500", "Media milla al cielo", "Acumula 500 km", totalKm, 500, "km"),
    mk("k1000", "Leyenda", "Acumula 1.000 km", totalKm, 1000, "km"),
    mk("hours50", "50 horas", "Acumula 50 h de entrenamiento", totalHours, 50, "h"),
    mk("streak7", "Semana perfecta", "7 días seguidos entrenando", streak, 7, "días"),
    mk("streak30", "Imparable", "30 días seguidos entrenando", streak, 30, "días"),
    mk("multi", "Multideporte", "Practica 4 deportes distintos", sports, 4, "deportes"),
    mk("climber", "Escalador", "Acumula 5.000 m de desnivel", elevation, 5000, "m+"),
    mk("half", "Distancia media maratón", "Una sesión de 21 km o más", longest, 21, "km"),
    mk("marathon", "Maratoniano", "Una sesión de 42 km o más", longest, 42, "km"),
    mk("early", "Madrugador", "5 entrenos antes de las 7:00", earlyBirds, 5, "entrenos"),
  ];
}

export function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates.map((d) => dayKey(d)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!set.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dayKey(cursor))) return 0;
  }
  while (set.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest historical streak of consecutive active days. */
export function longestStreak(dates: string[]): number {
  const days = Array.from(new Set(dates.map((d) => dayKey(d)))).sort();
  let best = 0, cur = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cd = new Date(d);
    if (prev && (cd.getTime() - prev.getTime()) / 86400000 === 1) cur += 1;
    else cur = 1;
    best = Math.max(best, cur);
    prev = cd;
  }
  return best;
}

export function toCSV(workouts: WorkoutRow[]): string {
  const cols = ["workout_date", "sport", "title", "distance_km", "duration_seconds", "pace_seconds_per_km", "avg_heart_rate", "elevation_gain_m", "calories", "perceived_effort", "notes"];
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...workouts.map((w) => cols.map((c) => esc((w as any)[c])).join(","))].join("\n");
}
