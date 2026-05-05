import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Flame, Trophy, TrendingUp, Plus, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDuration, formatPace } from "@/lib/sport";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Workout {
  id: string;
  workout_date: string;
  title: string | null;
  sport: string;
  distance_km: number | null;
  duration_seconds: number | null;
  pace_seconds_per_km: number | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(20);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: w } = await supabase.from("workouts").select("*").order("workout_date", { ascending: false }).limit(50);
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
  const weekKm = thisWeek.reduce((s, w) => s + (Number(w.distance_km) || 0), 0);
  const totalKm = workouts.reduce((s, w) => s + (Number(w.distance_km) || 0), 0);
  const totalSec = workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0);
  const longest = workouts.reduce((m, w) => Math.max(m, Number(w.distance_km) || 0), 0);

  const chartData = [...workouts].reverse().slice(-14).map((w) => ({
    date: new Date(w.workout_date).toLocaleDateString("es", { day: "numeric", month: "short" }),
    km: Number(w.distance_km) || 0,
  }));

  const greeting = profile?.full_name ? `Hola, ${profile.full_name.split(" ")[0]}` : "¡Bienvenido!";
  const progress = Math.min(100, (weekKm / weeklyGoal) * 100);

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
            <p className="text-sm text-muted-foreground">Objetivo semanal</p>
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
        <StatCard icon={MapPin} label="Distancia total" value={`${totalKm.toFixed(1)} km`} />
        <StatCard icon={Clock} label="Tiempo total" value={formatDuration(totalSec)} />
        <StatCard icon={Trophy} label="Más largo" value={`${longest.toFixed(1)} km`} />
      </div>

      {chartData.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl">Últimos 14 entrenos</h3>
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
            {workouts.slice(0, 5).map((w) => (
              <Link key={w.id} to="/app/workouts" className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/50 transition">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
                    <Activity className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{w.title || `Entrenamiento ${w.sport}`}</div>
                    <div className="text-xs text-muted-foreground">{new Date(w.workout_date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" })}</div>
                  </div>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <div className="text-xs text-muted-foreground">Dist.</div>
                    <div className="font-display font-black">{w.distance_km?.toFixed(1) ?? "—"} km</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs text-muted-foreground">Ritmo</div>
                    <div className="font-display font-black">{formatPace(w.pace_seconds_per_km)}</div>
                  </div>
                </div>
              </Link>
            ))}
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
