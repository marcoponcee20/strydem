import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { computePace } from "@/lib/sport";
import { ArrowLeft } from "lucide-react";
import { SPORTS, SPORT_LABEL, hasField, getExtras, sportIcon } from "@/lib/sportConfig";

export default function NewWorkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sport: "running",
    title: "",
    workout_date: new Date().toISOString().slice(0, 10),
    distance_km: "",
    hours: "",
    minutes: "",
    seconds: "",
    avg_heart_rate: "",
    max_heart_rate: "",
    elevation_gain_m: "",
    calories: "",
    perceived_effort: "5",
    notes: "",
  });
  const [extras, setExtras] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setExtra = (k: string, v: string) => setExtras((e) => ({ ...e, [k]: v }));

  const sport = form.sport;
  const SportIcon = sportIcon(sport);
  const extraFields = useMemo(() => getExtras(sport), [sport]);
  const distanceLabel = sport === "natación" ? "Distancia (m)" : "Distancia (km)";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // For swimming, user enters meters; convert to km for storage
    let dist: number | null = null;
    if (form.distance_km) {
      const n = Number(form.distance_km);
      dist = sport === "natación" ? n / 1000 : n;
    }

    const dur =
      (Number(form.hours) || 0) * 3600 +
      (Number(form.minutes) || 0) * 60 +
      (Number(form.seconds) || 0);
    const pace = hasField(sport, "pace") ? computePace(dist, dur || null) : null;

    // Clean extras: only include filled fields, coerce numbers
    const cleanExtras: Record<string, any> = {};
    for (const f of extraFields) {
      const raw = extras[f.key];
      if (raw === undefined || raw === "") continue;
      cleanExtras[f.key] = f.type === "number" ? Number(raw) : raw;
    }

    const { error } = await supabase.from("workouts").insert({
      user_id: user.id,
      sport,
      title: form.title || null,
      workout_date: form.workout_date,
      distance_km: hasField(sport, "distance") ? dist : null,
      duration_seconds: dur || null,
      pace_seconds_per_km: pace,
      avg_heart_rate: hasField(sport, "hr") && form.avg_heart_rate ? Number(form.avg_heart_rate) : null,
      max_heart_rate: hasField(sport, "hr") && form.max_heart_rate ? Number(form.max_heart_rate) : null,
      elevation_gain_m: hasField(sport, "elevation") && form.elevation_gain_m ? Number(form.elevation_gain_m) : null,
      calories: hasField(sport, "calories") && form.calories ? Number(form.calories) : null,
      perceived_effort: Number(form.perceived_effort),
      notes: form.notes || null,
      extras: cleanExtras,
    });
    setLoading(false);
    if (error) return toast.error(toUserMessage(error));
    toast.success("¡Entrenamiento guardado!");
    navigate("/app/workouts");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
          <SportIcon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Nuevo</p>
          <h1 className="text-4xl">Registrar entrenamiento</h1>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5 bg-surface border border-border rounded-2xl p-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Deporte</Label>
            <Select value={form.sport} onValueChange={(v) => { set("sport", v); setExtras({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPORTS.map((s) => <SelectItem key={s} value={s}>{SPORT_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input type="date" value={form.workout_date} onChange={(e) => set("workout_date", e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Título (opcional)</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="ej. Tirada larga, 5x1k, pecho y tríceps" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {hasField(sport, "distance") && (
            <div className="space-y-2">
              <Label>{distanceLabel}</Label>
              <Input type="number" step={sport === "natación" ? "1" : "0.01"} value={form.distance_km} onChange={(e) => set("distance_km", e.target.value)} />
            </div>
          )}
          {hasField(sport, "duration") && (
            <div className="space-y-2">
              <Label>Duración (h / m / s)</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" placeholder="h" value={form.hours} onChange={(e) => set("hours", e.target.value)} />
                <Input type="number" min="0" max="59" placeholder="m" value={form.minutes} onChange={(e) => set("minutes", e.target.value)} />
                <Input type="number" min="0" max="59" placeholder="s" value={form.seconds} onChange={(e) => set("seconds", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {hasField(sport, "hr") && <>
            <div className="space-y-2"><Label>FC media (bpm)</Label><Input type="number" value={form.avg_heart_rate} onChange={(e) => set("avg_heart_rate", e.target.value)} /></div>
            <div className="space-y-2"><Label>FC máx (bpm)</Label><Input type="number" value={form.max_heart_rate} onChange={(e) => set("max_heart_rate", e.target.value)} /></div>
          </>}
          {hasField(sport, "elevation") && (
            <div className="space-y-2"><Label>Desnivel (m)</Label><Input type="number" value={form.elevation_gain_m} onChange={(e) => set("elevation_gain_m", e.target.value)} /></div>
          )}
          {hasField(sport, "calories") && (
            <div className="space-y-2"><Label>Calorías</Label><Input type="number" value={form.calories} onChange={(e) => set("calories", e.target.value)} /></div>
          )}
        </div>

        {extraFields.length > 0 && (
          <div className="space-y-3 border-t border-border pt-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Datos específicos de {SPORT_LABEL[sport as keyof typeof SPORT_LABEL]}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {extraFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}{f.unit ? ` (${f.unit})` : ""}</Label>
                  <Input
                    type={f.type}
                    step={f.step}
                    value={extras[f.key] ?? ""}
                    onChange={(e) => setExtra(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {hasField(sport, "effort") && (
          <div className="space-y-2">
            <Label>Esfuerzo percibido: {form.perceived_effort}/10</Label>
            <input type="range" min="1" max="10" value={form.perceived_effort} onChange={(e) => set("perceived_effort", e.target.value)} className="w-full accent-[hsl(var(--primary))]" />
          </div>
        )}

        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="¿Cómo te sentiste? ¿Ruta, condiciones, sensaciones?" />
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
          {loading ? "Guardando..." : "Guardar entrenamiento"}
        </Button>
      </form>
    </div>
  );
}
