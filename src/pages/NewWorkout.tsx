import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { computePace } from "@/lib/sport";
import { ArrowLeft } from "lucide-react";

const sports = ["running", "ciclismo", "natación", "trail", "gym", "trekking", "fútbol", "otros"];

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

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const dist = form.distance_km ? Number(form.distance_km) : null;
    const dur =
      (Number(form.hours) || 0) * 3600 +
      (Number(form.minutes) || 0) * 60 +
      (Number(form.seconds) || 0);
    const pace = computePace(dist, dur || null);
    const { error } = await supabase.from("workouts").insert({
      user_id: user.id,
      sport: form.sport,
      title: form.title || null,
      workout_date: form.workout_date,
      distance_km: dist,
      duration_seconds: dur || null,
      pace_seconds_per_km: pace,
      avg_heart_rate: form.avg_heart_rate ? Number(form.avg_heart_rate) : null,
      max_heart_rate: form.max_heart_rate ? Number(form.max_heart_rate) : null,
      elevation_gain_m: form.elevation_gain_m ? Number(form.elevation_gain_m) : null,
      calories: form.calories ? Number(form.calories) : null,
      perceived_effort: Number(form.perceived_effort),
      notes: form.notes || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("¡Entrenamiento guardado!");
    navigate("/app/workouts");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
      <div>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Nuevo</p>
        <h1 className="text-4xl">Registrar entrenamiento</h1>
      </div>

      <form onSubmit={submit} className="space-y-5 bg-surface border border-border rounded-2xl p-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Deporte</Label>
            <Select value={form.sport} onValueChange={(v) => set("sport", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{sports.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input type="date" value={form.workout_date} onChange={(e) => set("workout_date", e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Título (opcional)</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="ej. Tirada larga, intervalos 5x1k" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Distancia (km)</Label>
            <Input type="number" step="0.01" value={form.distance_km} onChange={(e) => set("distance_km", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Duración (h / m / s)</Label>
            <div className="flex gap-2">
              <Input type="number" min="0" placeholder="h" value={form.hours} onChange={(e) => set("hours", e.target.value)} />
              <Input type="number" min="0" max="59" placeholder="m" value={form.minutes} onChange={(e) => set("minutes", e.target.value)} />
              <Input type="number" min="0" max="59" placeholder="s" value={form.seconds} onChange={(e) => set("seconds", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>FC media (bpm)</Label><Input type="number" value={form.avg_heart_rate} onChange={(e) => set("avg_heart_rate", e.target.value)} /></div>
          <div className="space-y-2"><Label>FC máx (bpm)</Label><Input type="number" value={form.max_heart_rate} onChange={(e) => set("max_heart_rate", e.target.value)} /></div>
          <div className="space-y-2"><Label>Desnivel (m)</Label><Input type="number" value={form.elevation_gain_m} onChange={(e) => set("elevation_gain_m", e.target.value)} /></div>
          <div className="space-y-2"><Label>Calorías</Label><Input type="number" value={form.calories} onChange={(e) => set("calories", e.target.value)} /></div>
        </div>

        <div className="space-y-2">
          <Label>Esfuerzo percibido: {form.perceived_effort}/10</Label>
          <input type="range" min="1" max="10" value={form.perceived_effort} onChange={(e) => set("perceived_effort", e.target.value)} className="w-full accent-[hsl(var(--primary))]" />
        </div>

        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="¿Cómo te sentiste? ¿Ruta, condiciones?" />
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
          {loading ? "Guardando..." : "Guardar entrenamiento"}
        </Button>
      </form>
    </div>
  );
}
