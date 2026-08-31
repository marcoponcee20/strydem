import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Watch, UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { parseActivityFile, type ParsedActivity } from "@/lib/activityFile";
import { computePace } from "@/lib/sport";
import { formatDuration } from "@/lib/sport";
import { sportLabel } from "@/lib/sportConfig";

const BRANDS = [
  { name: "Garmin", how: "Garmin Connect → Actividad → ⚙ → Exportar a GPX/TCX" },
  { name: "Polar", how: "Polar Flow → Sesión → ... → Exportar TCX" },
  { name: "Suunto", how: "Suunto App → Actividad → Compartir → Exportar GPX" },
  { name: "Coros", how: "COROS App → Actividad → ... → Exportar GPX/TCX" },
  { name: "Apple Watch", how: "App de terceros (HealthFit, RunGap) → Exportar GPX" },
  { name: "Strava", how: "Actividad → ... → Exportar GPX original" },
];

export default function Devices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<ParsedActivity[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length || !user) return;
    setBusy(true);
    const done: ParsedActivity[] = [];
    for (const file of Array.from(files)) {
      try {
        const a = await parseActivityFile(file);
        const { error } = await supabase.from("workouts").insert({
          user_id: user.id,
          sport: a.sport,
          title: a.title,
          workout_date: a.workout_date,
          distance_km: a.distance_km,
          duration_seconds: a.duration_seconds,
          pace_seconds_per_km: computePace(a.distance_km, a.duration_seconds),
          avg_heart_rate: a.avg_heart_rate,
          max_heart_rate: a.max_heart_rate,
          elevation_gain_m: a.elevation_gain_m,
          calories: a.calories,
          notes: "Importado automáticamente desde tu reloj",
          extras: {},
        });
        if (error) throw error;
        done.push(a);
      } catch (e: any) {
        toast.error(e?.message ? String(e.message) : toUserMessage(e));
      }
    }
    setImported((prev) => [...done, ...prev]);
    setBusy(false);
    if (done.length) toast.success(`${done.length} entreno(s) guardado(s) para siempre`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
          <Watch className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Dispositivos</p>
          <h1 className="text-4xl">Mi reloj</h1>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`bg-surface border-2 border-dashed rounded-2xl p-10 text-center transition ${
          dragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <UploadCloud className="h-10 w-10 mx-auto text-primary mb-4" />
        <h2 className="text-xl font-semibold">Sincroniza tu entreno</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Al terminar la sesión, arrastra aquí el archivo <strong>.GPX</strong> o <strong>.TCX</strong> de
          tu reloj. Calculamos distancia, tiempo, ritmo, desnivel y pulsaciones, y lo guardamos en tu historial.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.tcx,application/gpx+xml,text/xml"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          className="mt-5 bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</> : "Seleccionar archivos"}
        </Button>
      </div>

      {imported.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Importado ahora</p>
          {imported.map((a, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center gap-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-[160px]">
                <div className="font-semibold">{a.title || sportLabel(a.sport)}</div>
                <div className="text-xs text-muted-foreground">
                  {sportLabel(a.sport)} · {new Date(a.workout_date).toLocaleDateString("es")}
                </div>
              </div>
              <div className="text-sm">{a.distance_km ? `${a.distance_km} km` : "—"}</div>
              <div className="text-sm">{formatDuration(a.duration_seconds)}</div>
              <div className="text-sm">{a.avg_heart_rate ? `${a.avg_heart_rate} bpm` : "—"}</div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => navigate("/app/workouts")}>Ver historial</Button>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Cómo exportar desde tu reloj</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {BRANDS.map((b) => (
            <div key={b.name} className="bg-background/40 border border-border rounded-lg p-3">
              <div className="font-display font-black text-sm">{b.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.how}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          La sincronización automática por cuenta (tipo Strava/Garmin Connect) requiere claves de API propias
          del fabricante; pídemelo y la conectamos cuando las tengas.
        </p>
      </div>
    </div>
  );
}
