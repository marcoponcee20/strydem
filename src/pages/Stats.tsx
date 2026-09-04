import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarAngleAxis, PolarGrid } from "recharts";
import { formatDuration } from "@/lib/sport";
import { sportLabel, SPORTS } from "@/lib/sportConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, useWorkouts } from "@/hooks/useWorkouts";
import { buildLoadSeries, sessionLoad } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(14 100% 57%)", "hsl(350 95% 58%)", "hsl(40 95% 55%)", "hsl(145 70% 50%)", "hsl(220 80% 60%)", "hsl(280 70% 60%)", "hsl(180 70% 50%)"];
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function Stats() {
  const { data: allItems = [], isLoading } = useWorkouts();
  const { data: profile } = useProfile();
  const [sportFilter, setSportFilter] = useState<string>("all");

  const items = useMemo(
    () => (sportFilter === "all" ? allItems : allItems.filter((w) => w.sport === sportFilter)),
    [allItems, sportFilter],
  );

  // Weekly volume
  const weekData = useMemo(() => {
    const weeks: Record<string, { km: number; min: number }> = {};
    items.forEach((w) => {
      const d = new Date(w.workout_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const k = monday.toISOString().slice(0, 10);
      const cur = weeks[k] || { km: 0, min: 0 };
      cur.km += Number(w.distance_km) || 0;
      cur.min += (w.duration_seconds || 0) / 60;
      weeks[k] = cur;
    });
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-16)
      .map(([k, v]) => ({
        week: new Date(k).toLocaleDateString("es", { day: "numeric", month: "short" }),
        km: Number(v.km.toFixed(1)),
        min: Math.round(v.min),
      }));
  }, [items]);

  // Monthly volume
  const monthData = useMemo(() => {
    const months: Record<string, number> = {};
    items.forEach((w) => {
      const d = new Date(w.workout_date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[k] = (months[k] || 0) + (Number(w.distance_km) || 0);
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([k, v]) => ({
        month: new Date(`${k}-01`).toLocaleDateString("es", { month: "short", year: "2-digit" }),
        km: Number(v.toFixed(1)),
      }));
  }, [items]);

  // Weekday distribution (by minutes)
  const dayData = useMemo(() => {
    const arr = DAYS.map((d) => ({ day: d, min: 0 }));
    items.forEach((w) => {
      const idx = (new Date(w.workout_date).getDay() + 6) % 7;
      arr[idx].min += (w.duration_seconds || 0) / 60;
    });
    return arr.map((a) => ({ ...a, min: Math.round(a.min) }));
  }, [items]);

  // Training load per week
  const loadData = useMemo(() => {
    const series = buildLoadSeries(allItems, 84, profile?.max_hr, profile?.resting_hr);
    const weeks: Record<string, number> = {};
    series.forEach((p) => {
      const d = new Date(p.date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const k = monday.toISOString().slice(0, 10);
      weeks[k] = (weeks[k] || 0) + p.load;
    });
    return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({
      week: new Date(k).toLocaleDateString("es", { day: "numeric", month: "short" }),
      carga: Math.round(v),
    }));
  }, [allItems, profile?.max_hr, profile?.resting_hr]);

  const sportData = useMemo(() => {
    const map: Record<string, number> = {};
    allItems.forEach((w) => { map[w.sport] = (map[w.sport] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: sportLabel(name), value }));
  }, [allItems]);

  const total = items.reduce((s, w) => s + (Number(w.distance_km) || 0), 0);
  const totalT = items.reduce((s, w) => s + (w.duration_seconds || 0), 0);
  const avgLoad = items.length
    ? Math.round(items.reduce((s, w) => s + sessionLoad(w, profile?.max_hr, profile?.resting_hr), 0) / items.length)
    : 0;

  if (isLoading) return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Análisis</p>
          <h1 className="text-4xl">Estadísticas</h1>
        </div>
        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los deportes</SelectItem>
            {SPORTS.map((s) => <SelectItem key={s} value={s}>{sportLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card label="Sesiones" value={`${items.length}`} />
        <Card label="Tiempo acumulado" value={formatDuration(totalT)} />
        <Card label="Distancia acumulada" value={sportFilter === "natación" ? `${(total * 1000).toFixed(0)} m` : `${total.toFixed(1)} km`} />
        <Card label="Carga media / sesión" value={`${avgLoad}`} />
      </div>

      <Panel title="Volumen semanal (últimas 16 semanas)">
        <BarsChart data={weekData} x="week" y="km" name="km" />
      </Panel>

      <Panel title="Volumen mensual (últimos 12 meses)">
        <BarsChart data={monthData} x="month" y="km" name="km" />
      </Panel>

      <Panel title="Carga de entrenamiento por semana">
        <BarsChart data={loadData} x="week" y="carga" name="carga" color="hsl(350 95% 58%)" />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Cuándo entrenas (minutos por día de la semana)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={dayData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Radar dataKey="min" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Reparto por deporte">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sportData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {sportData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h3 className="font-display text-xl mb-4">{title}</h3>
      {children}
    </div>
  );
}

function BarsChart({ data, x, y, name, color = "hsl(var(--primary))" }: { data: any[]; x: string; y: string; name: string; color?: string }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Aún no hay datos suficientes.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={x} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <Tooltip cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
          <Bar dataKey={y} name={name} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="font-display font-black text-2xl mt-1">{value}</div>
    </div>
  );
}
