export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatPace(secondsPerKm?: number | null) {
  if (!secondsPerKm || secondsPerKm <= 0) return "—";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function computePace(distanceKm?: number | null, durationSec?: number | null) {
  if (!distanceKm || !durationSec || distanceKm <= 0) return null;
  return Math.round(durationSec / distanceKm);
}

export function calcAge(birth?: string | null) {
  if (!birth) return null;
  const d = new Date(birth);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function calcBMI(heightCm?: number | null, weightKg?: number | null) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}
