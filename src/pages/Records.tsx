import { useMemo } from "react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { SPORTS, sportIcon, sportLabel } from "@/lib/sportConfig";
import { calcStreak, computeBadges, longestStreak, runningMilestones, sportRecords, toCSV } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Award, Download, Medal, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Records() {
  const { data: workouts = [], isLoading } = useWorkouts();

  const streak = useMemo(() => calcStreak(workouts.map((w) => w.workout_date)), [workouts]);
  const best = useMemo(() => longestStreak(workouts.map((w) => w.workout_date)), [workouts]);
  const badges = useMemo(() => computeBadges(workouts, Math.max(streak, best)), [workouts, streak, best]);
  const milestones = useMemo(() => runningMilestones(workouts), [workouts]);
  const bySport = useMemo(
    () => SPORTS.map((s) => ({ sport: s, recs: sportRecords(workouts, s) })).filter((x) => x.recs.length > 0),
    [workouts],
  );

  const exportCsv = () => {
    const blob = new Blob([toCSV(workouts)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stryde-entrenamientos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const earned = badges.filter((b) => b.earned).length;

  if (isLoading) return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Tu palmarés</p>
          <h1 className="text-4xl">Récords y logros</h1>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={workouts.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Streaks */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Tile label="Racha actual" value={`${streak} ${streak === 1 ? "día" : "días"}`} />
        <Tile label="Mejor racha histórica" value={`${best} ${best === 1 ? "día" : "días"}`} />
        <Tile label="Logros desbloqueados" value={`${earned} / ${badges.length}`} />
      </div>

      {/* Running milestones */}
      <section className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl">Marcas por distancia (running / trail)</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {milestones.map((m) => (
            <div key={m.label} className="bg-background/40 border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest">{m.label}</div>
              <div className="font-display font-black text-2xl mt-1">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">Estimadas a partir del ritmo medio de tus sesiones más rápidas de esa distancia o superior.</p>
      </section>

      {/* Records per sport */}
      {bySport.map(({ sport, recs }) => {
        const Icon = sportIcon(sport);
        return (
          <section key={sport} className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl">{sportLabel(sport)}</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recs.map((r) => (
                <div key={r.label} className="bg-background/40 border border-border rounded-xl p-4">
                  <div className="text-xs text-muted-foreground">{r.label}</div>
                  <div className="font-display font-black text-xl mt-1">{r.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {r.sub ? `${r.sub} · ` : ""}
                    {r.date ? new Date(r.date).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Badges */}
      <section className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl">Logros</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((b) => {
            const pct = Math.min(100, (b.progress / b.target) * 100);
            return (
              <div key={b.id} className={`rounded-xl p-4 border transition ${b.earned ? "border-primary/60 bg-primary/10" : "border-border bg-background/40"}`}>
                <div className="flex items-center gap-2">
                  <Medal className={`h-4 w-4 ${b.earned ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-semibold text-sm">{b.name}</span>
                  {b.earned && <span className="ml-auto text-[10px] uppercase tracking-widest text-primary">Logrado</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {b.progress % 1 === 0 ? b.progress : b.progress.toFixed(1)} / {b.target} {b.unit}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="font-display font-black text-3xl mt-1">{value}</div>
    </div>
  );
}
