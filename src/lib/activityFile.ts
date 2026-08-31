// Parser de archivos de actividad exportados por relojes deportivos (GPX / TCX).
// Devuelve un resumen listo para guardar como entrenamiento.

export type ParsedActivity = {
  sport: string;
  title: string | null;
  workout_date: string;
  distance_km: number | null;
  duration_seconds: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  elevation_gain_m: number | null;
  calories: number | null;
};

const toRad = (v: number) => (v * Math.PI) / 180;

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function mapSport(raw: string | null | undefined): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("bik") || s.includes("cycl") || s.includes("ride")) return "ciclismo";
  if (s.includes("swim") || s.includes("nat")) return "natación";
  if (s.includes("walk") || s.includes("hik") || s.includes("camin")) return "senderismo";
  if (s.includes("strength") || s.includes("gym") || s.includes("weight")) return "gimnasio";
  return "running";
}

function num(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(list: number[]) {
  if (!list.length) return null;
  return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
}

function summarize(
  points: { lat?: number; lon?: number; time?: number; ele?: number; hr?: number }[],
  base: Partial<ParsedActivity>,
): ParsedActivity {
  let distance = 0;
  let gain = 0;
  const hrs: number[] = [];
  let prev: typeof points[number] | null = null;

  for (const p of points) {
    if (p.hr) hrs.push(p.hr);
    if (prev) {
      if (
        prev.lat !== undefined && prev.lon !== undefined &&
        p.lat !== undefined && p.lon !== undefined
      ) {
        distance += haversineKm([prev.lat, prev.lon], [p.lat, p.lon]);
      }
      if (prev.ele !== undefined && p.ele !== undefined && p.ele > prev.ele) {
        gain += p.ele - prev.ele;
      }
    }
    prev = p;
  }

  const times = points.map((p) => p.time).filter((t): t is number => !!t);
  const duration = times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 1000) : null;
  const firstTime = times.length ? new Date(Math.min(...times)) : new Date();

  return {
    sport: base.sport ?? "running",
    title: base.title ?? null,
    workout_date: base.workout_date ?? firstTime.toISOString().slice(0, 10),
    distance_km: base.distance_km ?? (distance > 0 ? Number(distance.toFixed(2)) : null),
    duration_seconds: base.duration_seconds ?? duration,
    avg_heart_rate: base.avg_heart_rate ?? avg(hrs),
    max_heart_rate: base.max_heart_rate ?? (hrs.length ? Math.max(...hrs) : null),
    elevation_gain_m: base.elevation_gain_m ?? (gain > 0 ? Math.round(gain) : null),
    calories: base.calories ?? null,
  };
}

function textOf(parent: Element, selector: string): string | null {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() ?? null;
}

function parseGpx(doc: Document, fileName: string): ParsedActivity {
  const trkpts = Array.from(doc.getElementsByTagName("trkpt"));
  const points = trkpts.map((pt) => {
    const hrEl = Array.from(pt.getElementsByTagName("*")).find((e) =>
      e.tagName.toLowerCase().endsWith("hr")
    );
    const timeText = textOf(pt, "time");
    return {
      lat: num(pt.getAttribute("lat")) ?? undefined,
      lon: num(pt.getAttribute("lon")) ?? undefined,
      ele: num(textOf(pt, "ele")) ?? undefined,
      hr: num(hrEl?.textContent ?? null) ?? undefined,
      time: timeText ? new Date(timeText).getTime() : undefined,
    };
  });

  const trk = doc.getElementsByTagName("trk")[0];
  const name = trk ? textOf(trk, "name") : null;
  const type = trk ? textOf(trk, "type") : null;

  return summarize(points, {
    sport: mapSport(type || name || fileName),
    title: name || fileName.replace(/\.[^.]+$/, ""),
  });
}

function parseTcx(doc: Document, fileName: string): ParsedActivity {
  const activity = doc.getElementsByTagName("Activity")[0];
  const sport = mapSport(activity?.getAttribute("Sport") || fileName);

  const laps = Array.from(doc.getElementsByTagName("Lap"));
  let distance = 0;
  let duration = 0;
  let calories = 0;
  for (const lap of laps) {
    distance += num(textOf(lap, "DistanceMeters")) ?? 0;
    duration += num(textOf(lap, "TotalTimeSeconds")) ?? 0;
    calories += num(textOf(lap, "Calories")) ?? 0;
  }

  const trackpoints = Array.from(doc.getElementsByTagName("Trackpoint"));
  const points = trackpoints.map((tp) => {
    const pos = tp.getElementsByTagName("Position")[0];
    const hrEl = tp.getElementsByTagName("HeartRateBpm")[0];
    const timeText = textOf(tp, "Time");
    return {
      lat: pos ? num(textOf(pos, "LatitudeDegrees")) ?? undefined : undefined,
      lon: pos ? num(textOf(pos, "LongitudeDegrees")) ?? undefined : undefined,
      ele: num(textOf(tp, "AltitudeMeters")) ?? undefined,
      hr: hrEl ? num(textOf(hrEl, "Value")) ?? undefined : undefined,
      time: timeText ? new Date(timeText).getTime() : undefined,
    };
  });

  const idText = activity ? textOf(activity, "Id") : null;

  return summarize(points, {
    sport,
    title: fileName.replace(/\.[^.]+$/, ""),
    workout_date: idText ? new Date(idText).toISOString().slice(0, 10) : undefined,
    distance_km: distance > 0 ? Number((distance / 1000).toFixed(2)) : undefined,
    duration_seconds: duration > 0 ? Math.round(duration) : undefined,
    calories: calories > 0 ? Math.round(calories) : undefined,
  });
}

export async function parseActivityFile(file: File): Promise<ParsedActivity> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("El archivo no se pudo leer. Debe ser un .gpx o .tcx válido.");
  }
  const root = doc.documentElement?.tagName?.toLowerCase() ?? "";
  if (root.includes("trainingcenterdatabase")) return parseTcx(doc, file.name);
  if (root.includes("gpx")) return parseGpx(doc, file.name);
  throw new Error("Formato no soportado. Exporta el entreno en .gpx o .tcx.");
}
