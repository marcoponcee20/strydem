import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { formatDuration } from "@/lib/sport";
import { sportLabel, hasField, SPORTS } from "@/lib/sportConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Stats() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [sportFilter, setSportFilter] = useState<string>("all");
  useEffect(() => {
    supabase.from("workouts").select("*").order("workout_date").then(({ data }) => setAllItems(data || []));
  }, []);

  const items = useMemo(
    () => sportFilter === "all" ? allItems : allItems.filter((w) => w.sport === sportFilter),
    [allItems, sportFilter],
  );

  // Weekly aggregation last 8 weeks
  const weeks: Record<string, number> = {};
  items.forEach((w) => {
    const d = new Date(w.workout_date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = monday.toISOString().slice(0, 10);
    weeks[k] = (weeks[k] || 0) + (Number(w.distance_km) || 0);
  });
  const weekData = Object.entries(weeks).slice(-8).map(([k, v]) => ({
    week: new Date(k).toLocaleDateString("es", { day: "numeric", month: "short" }),
    km: Number(v.toFixed(1)),
  }));

  // Sport distribution uses ALL data (independent of filter)
  const sportData = useMemo(() => {
    const sportMap: Record<string, number> = {};
    allItems.forEach((w) => { sportMap[w.sport] = (sportMap[w.sport] || 0) + 1; });
    return Object.entries(sportMap).map(([name, value]) => ({ name: sportLabel(name), value }));
  }, [allItems]);

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

      <div className="grid sm:grid-cols-3 gap-4">
        <Card label="Sesiones" value={`${items.length}`} />
        <Card label="Tiempo acumulado" value={formatDuration(totalT)} />
        <Card label={sportFilter === "natación" ? "Distancia total" : "Distancia total"} value={sportFilter === "natación" ? `${(total * 1000).toFixed(0)} m` : `${total.toFixed(1)} km`} />
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="font-display text-xl mb-4">Volumen semanal (km)</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="km" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {sportData.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="font-display text-xl mb-4">Distribución por deporte</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sportData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {sportData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="font-display font-black text-3xl mt-1">{value}</div>
    </div>
  );
}
