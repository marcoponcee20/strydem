import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Activity } from "lucide-react";
import { formatDuration, formatPace } from "@/lib/sport";
import { toast } from "sonner";

export default function Workouts() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("workouts").select("*").order("workout_date", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Entrenamiento eliminado");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Historial</p>
          <h1 className="text-4xl">Entrenamientos</h1>
        </div>
        <Button asChild className="bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
          <Link to="/app/workouts/new"><Plus className="mr-2 h-4 w-4" /> Nuevo</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aún sin entrenos. ¡Empieza ahora!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((w) => (
            <div key={w.id} className="bg-surface border border-border rounded-xl p-5 flex flex-wrap items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow shrink-0">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold">{w.title || `Sesión de ${w.sport}`}</div>
                <div className="text-xs text-muted-foreground">{new Date(w.workout_date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</div>
                {w.notes && <p className="text-sm text-muted-foreground mt-1">{w.notes}</p>}
              </div>
              <Stat label="Distancia" value={w.distance_km ? `${Number(w.distance_km).toFixed(2)} km` : "—"} />
              <Stat label="Tiempo" value={formatDuration(w.duration_seconds)} />
              <Stat label="Ritmo" value={formatPace(w.pace_seconds_per_km)} />
              <Stat label="FC media" value={w.avg_heart_rate ? `${w.avg_heart_rate} bpm` : "—"} />
              <Button variant="ghost" size="icon" onClick={() => remove(w.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[80px]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display font-black">{value}</div>
    </div>
  );
}
