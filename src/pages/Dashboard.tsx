import { useMemo } from "react";
import { useWorkouts, useProfile } from "@/hooks/useWorkouts";
import { Activity, Flame, Trophy, TrendingUp, Plus, Clock, Zap, HeartPulse, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDuration } from "@/lib/sport";
import { sportIcon, sportLabel, formatPrimaryDistance, formatTempo, hasField } from "@/lib/sportConfig";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import { acwr, buildLoadSeries, calcStreak, formStatus } from "@/lib/analytics";

export default function Dashboard() {
  const { data: workouts = [], isLoading } = useWorkouts();
  const { data: profile } = useProfile();
  const weeklyGoal = Number(profile?.weekly_goal_km) || 20;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);

  const thisWeek = workouts.filter((w) => new Date(w.workout_date) >= weekStart);
  const lastWeek = workouts.filter((w) => new Date(w.workout_date) >= prevWeekStart && new Date(w.workout_date) < weekStart);

  const km = (list: typeof workouts) => list.reduce((s, w) => s + (hasField(w.sport, "distance") ? Number(w.distance_km) || 0 : 0), 0);
  const weekKm = km(thisWeek);
  const lastWeekKm = km(lastWeek);
  const totalKm = km(workouts);
  const totalSec = workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0);
  const trend = lastWeekKm > 0 ? ((weekKm - lastWeekKm) / lastWeekKm) * 100 : null;

  const streak = useMemo(() => calcStreak(workouts.map((w) => w.workout_date)), [workouts]);

  const series = useMemo(
    () => buildLoadSeries(workouts, 90, profile?.max_hr, profile?.resting_hr),
    [workouts, profile?.max_hr, profile?.resting_hr],
  );
  const last = series[series.length - 1];
  const form = formStatus(last?.tsb ?? 0);
  const ratio = acwr(series);

  const bySport = useMemo(() => {
    const map = new Map<string, { count: number; km: number; sec: number }>();
    for (const w of workouts) {
      const cur = map.get(w.sport) || { count: 0, km: 0, sec: 0 };
      cur.count += 1;
      cur.km += Number(w.distance_km) || 0;
      cur.sec += w.duration_seconds || 0;
      map.set(w.sport, cur);
    }
    return Array.from(map.entries()).map(([sport, v]) => ({ sport, ...v })).sort((a, b) => b.count - a.count);
  }, [workouts]);

  const chartData = [...workouts]
    .filter((w) => hasField(w.sport, "distance"))
    .reverse()
    .slice(-14)
    .map((w) => ({
      date: new Date(w.workout_date).toLocaleDateString("es", { day: "numeric", month: "short" }),
      km: Number(w.distance_km) || 0,
    }));

  const greeting = profile?.full_name ? `Hola, ${profile.full_name.split(" ")[0]}` : "¡Bienvenido!";
  const progress = Math.min(100, (weekKm / weeklyGoal) * 100);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const toneClass = { good: "text-emerald-400", neutral: "text-primary", warn: "text-amber-400", bad: "text-destructive" }[form.tone];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Resumen</p>
          <h1 className="text-4xl md:text-5xl">{greeting}</h1>
        </div>
        <Button asChild className="bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
          <Link to="/app/workouts/new"><Plus className="mr-2 h-4 w-4" /> Nuevo entreno</Link>
        </Button>
      </div>

      {/* All-time totals */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl">Totales históricos</h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-secondary px-2 py-0.5 rounded ml-auto">guardado permanentemente</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Entrenos totales" value={workouts.length} />
          <StatCard icon={Clock} label="Tiempo total" value={formatDuration(totalSec)} />
          <StatCard icon={TrendingUp} label="Distancia total" value={`${totalKm.toFixed(1)} km`} />
          <StatCard icon={Zap} label="Racha actual" value={`${streak} ${streak === 1 ? "día" : "días"}`} />
        </div>
      </div>

      {/* Form / readiness */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HeartPulse className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Estado de forma</span>
            </div>
            <div className={`font-display font-black text-3xl mt-2 ${toneClass}`}>{form.label}</div>
            <p className="text-xs text-muted-foreground mt-2">{form.hint}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5 text-center">
            <Mini label="Fitness" value={last ? last.ctl.toFixed(0) : "0"} />
            <Mini label="Fatiga" value={last ? last.atl.toFixed(0) : "0"} />
            <Mini label="Forma" value={last ? (last.tsb > 0 ? `+${last.tsb.toFixed(0)}` : last.tsb.toFixed(0)) : "0"} />
          </div>
          {ratio !== null && (
            <div className="mt-4 text-[11px] text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" />
              Ratio carga aguda/crónica: <strong className={ratio > 1.5 ? "text-destructive" : ratio < 0.8 ? "text-amber-400" : "text-emerald-400"}>{ratio}</strong>
              <span>(óptimo 0,8–1,3)</span>
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-display text-xl mb-4">Carga de entrenamiento — 90 días</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="ctlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={14} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="ctl" name="Fitness" stroke="hsl(var(--primary))" fill="url(#ctlGrad)" strokeWidth={2.5} />
                <Line type="monotone" dataKey="atl" name="Fatiga" stroke="hsl(350 95% 58%)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly goal */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Objetivo semanal (deportes con distancia)</p>
            <h2 className="text-3xl">{weekKm.toFixed(1)} <span className="text-muted-foreground text-lg">/ {weeklyGoal} km</span></h2>
            {trend !== null && (
              <p className={`text-xs mt-1 ${trend >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(0)}% respecto a la semana pasada ({lastWeekKm.toFixed(1)} km)
              </p>
            )}
          </div>
          <Flame className={`h-10 w-10 ${progress >= 100 ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ActivityHeatmap workouts={workouts} />

      {bySport.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="font-display text-xl mb-4">Por deporte</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bySport.map(({ sport, count, km: skm, sec }) => {
              const Icon = sportIcon(sport);
              return (
                <div key={sport} className="bg-background/40 border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{sportLabel(sport)}</div>
                    <div className="text-xs text-muted-foreground">
                      {count} {count === 1 ? "sesión" : "sesiones"}
                      {hasField(sport, "distance") && skm > 0 ? ` · ${skm.toFixed(1)} km` : ""}
                      {sec > 0 ? ` · ${formatDuration(sec)}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl">Distancia — últimos 14 entrenos</h3>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="km" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-display text-xl mb-4">Recientes</h3>
        {workouts.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-10 text-center">
            <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Aún no has registrado ningún entrenamiento.</p>
            <Button asChild className="bg-gradient-primary text-primary-foreground"><Link to="/app/workouts/new">Registrar el primero</Link></Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {workouts.slice(0, 5).map((w) => {
              const Icon = sportIcon(w.sport);
              const tempo = formatTempo(w.sport, w);
              return (
                <Link key={w.id} to="/app/workouts" className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/50 transition">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-11 w-11 rounded-lg bg-gradient-primary grid place-items-center shadow-glow shrink-0">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{w.title || `Sesión de ${sportLabel(w.sport)}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {sportLabel(w.sport)} · {new Date(w.workout_date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 text-right shrink-0">
                    {hasField(w.sport, "distance") && (
                      <div>
                        <div className="text-xs text-muted-foreground">Dist.</div>
                        <div className="font-display font-black">{formatPrimaryDistance(w.sport, w)}</div>
                      </div>
                    )}
                    <div className="hidden sm:block">
                      <div className="text-xs text-muted-foreground">{tempo.label}</div>
                      <div className="font-display font-black">{tempo.value}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="bg-background/40 border border-border rounded-xl p-5">
      <Icon className="h-5 w-5 text-primary mb-3" />
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="font-display font-black text-2xl mt-1">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/40 border border-border rounded-lg py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display font-black text-lg">{value}</div>
    </div>
  );
}
