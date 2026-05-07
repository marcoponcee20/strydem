import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Flame, Trophy, TrendingUp, Plus, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDuration } from "@/lib/sport";
import { sportIcon, sportLabel, formatPrimaryDistance, formatTempo, hasField } from "@/lib/sportConfig";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Workout {
  id: string;
  workout_date: string;
  title: string | null;
  sport: string;
  distance_km: number | null;
  duration_seconds: number | null;
  pace_seconds_per_km: number | null;
  avg_heart_rate: number | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(20);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: w } = await supabase.from("workouts").select("*").order("workout_date", { ascending: false }).limit(100);
      setWorkouts(w || []);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p);
      if (p?.weekly_goal_km) setWeeklyGoal(Number(p.weekly_goal_km));
    })();
  }, [user]);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = workouts.filter((w) => new Date(w.workout_date) >= weekStart);
  // Weekly goal in km: only counts sports with distance
  const weekKm = thisWeek.reduce((s, w) => s + (hasField(w.sport, "distance") ? Number(w.distance_km) || 0 : 0), 0);
  const totalKm = workouts.reduce((s, w) => s + (hasField(w.sport, "distance") ? Number(w.distance_km) || 0 : 0), 0);
  const totalSec = workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0);

  // Streak: consecutive days with at least one workout, ending today or yesterday
  const streak = useMemo(() => calcStreak(workouts.map((w) => w.workout_date)), [workouts]);

  // By sport breakdown
  const bySport = useMemo(() => {
    const map = new Map<string, { count: number; km: number; sec: number }>();
    for (const w of workouts) {
      const cur = map.get(w.sport) || { count: 0, km: 0, sec: 0 };
      cur.count += 1;
      cur.km += Number(w.distance_km) || 0;
      cur.sec += w.duration_seconds || 0;
      map.set(w.sport, cur);
    }
    return Array.from(map.entries())
      .map(([sport, v]) => ({ sport, ...v }))
      .sort((a, b) => b.count - a.count);
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

  // Sport-specific PR
  const longestKm = workouts.reduce((m, w) => Math.max(m, hasField(w.sport, "distance") ? Number(w.distance_km) || 0 : 0), 0);

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

      {/* Goal ring */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Objetivo semanal (running, ciclismo, trail, trekking…)</p>
            <h2 className="text-3xl">{weekKm.toFixed(1)} <span className="text-muted-foreground text-lg">/ {weeklyGoal} km</span></h2>
          </div>
          <Flame className={`h-10 w-10 ${progress >= 100 ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Entrenos" value={workouts.length} />
        <StatCard icon={Clock} label="Tiempo total" value={formatDuration(totalSec)} />
        <StatCard icon={Trophy} label="Récord distancia" value={`${longestKm.toFixed(1)} km`} />
        <StatCard icon={Zap} label="Racha actual" value={`${streak} ${streak === 1 ? "día" : "días"}`} />
      </div>

      {/* By-sport breakdown */}
      {bySport.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="font-display text-xl mb-4">Por deporte</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bySport.map(({ sport, count, km, sec }) => {
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
                      {hasField(sport, "distance") && km > 0 ? ` · ${km.toFixed(1)} km` : ""}
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
            <h3 className="font-display text-xl">Distancia — últimos 14</h3>
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
    <div className="bg-surface border border-border rounded-2xl p-5">
      <Icon className="h-5 w-5 text-primary mb-3" />
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="font-display font-black text-2xl mt-1">{value}</div>
    </div>
  );
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates.map((d) => d.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  // If no workout today, allow yesterday as the streak head
  let cursor = new Date(today);
  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
