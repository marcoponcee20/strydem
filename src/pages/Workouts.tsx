import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, Filter } from "lucide-react";
import { formatDuration } from "@/lib/sport";
import { sportIcon, sportLabel, formatPrimaryDistance, formatTempo, hasField, getExtras, SPORTS } from "@/lib/sportConfig";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import WorkoutMedia from "@/components/WorkoutMedia";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Workouts() {
  const [items, setItems] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    const { data } = await supabase.from("workouts").select("*").order("workout_date", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) return toast.error(toUserMessage(error));
    toast.success("Entrenamiento eliminado");
    load();
  };

  const filtered = useMemo(
    () => filter === "all" ? items : items.filter((w) => w.sport === filter),
    [items, filter],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Historial</p>
          <h1 className="text-4xl">Entrenamientos</h1>
          <p className="text-xs text-muted-foreground mt-1">Todos tus datos se guardan permanentemente.</p>
        </div>
        <Button asChild className="bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
          <Link to="/app/workouts/new"><Plus className="mr-2 h-4 w-4" /> Nuevo</Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los deportes</SelectItem>
            {SPORTS.map((s) => <SelectItem key={s} value={s}>{sportLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-2">{filtered.length} {filtered.length === 1 ? "sesión" : "sesiones"}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Sin entrenos para este filtro.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((w) => {
            const open = openId === w.id;
            const Icon = sportIcon(w.sport);
            const tempo = formatTempo(w.sport, w);
            return (
              <div key={w.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow shrink-0">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{w.title || `Sesión de ${sportLabel(w.sport)}`}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-secondary px-2 py-0.5 rounded">{sportLabel(w.sport)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(w.workout_date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</div>
                    {w.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{w.notes}</p>}
                  </div>
                  {hasField(w.sport, "distance") && (
                    <Stat label="Distancia" value={formatPrimaryDistance(w.sport, w)} />
                  )}
                  <Stat label="Tiempo" value={formatDuration(w.duration_seconds)} />
                  {(hasField(w.sport, "pace") || hasField(w.sport, "speed") || w.sport === "natación") && (
                    <Stat label={tempo.label} value={tempo.value} />
                  )}
                  {hasField(w.sport, "hr") && (
                    <Stat label="FC media" value={w.avg_heart_rate ? `${w.avg_heart_rate} bpm` : "—"} />
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setOpenId(open ? null : w.id)} className="text-muted-foreground">
                    <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(w.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {open && (
                  <div className="mt-5 pt-5 border-t border-border space-y-5">
                    <ExtrasGrid sport={w.sport} extras={w.extras} />
                    <WorkoutMedia workoutId={w.id} />
                  </div>
                )}
              </div>
            );
          })}
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

function ExtrasGrid({ sport, extras }: { sport: string; extras: Record<string, any> | null }) {
  const fields = getExtras(sport);
  const filled = fields.filter((f) => extras && extras[f.key] !== undefined && extras[f.key] !== "");
  if (filled.length === 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Detalles del deporte</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {filled.map((f) => (
          <div key={f.key} className="bg-background/40 border border-border rounded-lg p-3">
            <div className="text-xs text-muted-foreground">{f.label}</div>
            <div className="font-display font-black">
              {extras![f.key]}{f.unit ? ` ${f.unit}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
