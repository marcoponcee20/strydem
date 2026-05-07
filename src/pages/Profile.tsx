import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { calcAge, calcBMI } from "@/lib/sport";
import { User } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [p, setP] = useState<any>({
    full_name: "", username: "", birth_date: "", gender: "", height_cm: "", weight_kg: "",
    resting_hr: "", max_hr: "", fitness_level: "", primary_sport: "running", weekly_goal_km: "", bio: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setP({
        full_name: data.full_name ?? "", username: data.username ?? "",
        birth_date: data.birth_date ?? "", gender: data.gender ?? "",
        height_cm: data.height_cm ?? "", weight_kg: data.weight_kg ?? "",
        resting_hr: data.resting_hr ?? "", max_hr: data.max_hr ?? "",
        fitness_level: data.fitness_level ?? "", primary_sport: data.primary_sport ?? "running",
        weekly_goal_km: data.weekly_goal_km ?? "", bio: data.bio ?? "",
      });
    });
  }, [user]);

  const set = (k: string, v: any) => setP((s: any) => ({ ...s, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const payload: any = { id: user.id };
    Object.entries(p).forEach(([k, v]) => { payload[k] = v === "" ? null : v; });
    const { error } = await supabase.from("profiles").upsert(payload);
    setLoading(false);
    if (error) return toast.error(toUserMessage(error));
    toast.success("Perfil actualizado");
  };

  const age = calcAge(p.birth_date);
  const bmi = calcBMI(Number(p.height_cm) || null, Number(p.weight_kg) || null);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Atleta</p>
        <h1 className="text-4xl">Tu perfil</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Edad" value={age ? `${age} años` : "—"} />
        <Stat label="IMC" value={bmi ? bmi.toFixed(1) : "—"} />
        <Stat label="FC máx estimada" value={age ? `${220 - age} bpm` : "—"} />
      </div>

      <form onSubmit={save} className="space-y-5 bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-full bg-gradient-primary grid place-items-center shadow-glow">
            <User className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl">Datos personales</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nombre completo"><Input value={p.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label="Usuario"><Input value={p.username} onChange={(e) => set("username", e.target.value)} placeholder="@runner" /></Field>
          <Field label="Fecha de nacimiento"><Input type="date" value={p.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></Field>
          <Field label="Género">
            <Select value={p.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="femenino">Femenino</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
                <SelectItem value="prefiero-no-decir">Prefiero no decir</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <h2 className="font-display text-xl pt-4">Métricas físicas</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Altura (cm)"><Input type="number" value={p.height_cm} onChange={(e) => set("height_cm", e.target.value)} /></Field>
          <Field label="Peso (kg)"><Input type="number" step="0.1" value={p.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} /></Field>
          <Field label="FC en reposo"><Input type="number" value={p.resting_hr} onChange={(e) => set("resting_hr", e.target.value)} /></Field>
          <Field label="FC máxima"><Input type="number" value={p.max_hr} onChange={(e) => set("max_hr", e.target.value)} /></Field>
        </div>

        <h2 className="font-display text-xl pt-4">Deporte y objetivos</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Deporte principal">
            <Select value={p.primary_sport} onValueChange={(v) => set("primary_sport", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["running", "ciclismo", "natación", "trail", "triatlón", "gym", "fútbol", "otros"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nivel">
            <Select value={p.fitness_level} onValueChange={(v) => set("fitness_level", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="principiante">Principiante</SelectItem>
                <SelectItem value="intermedio">Intermedio</SelectItem>
                <SelectItem value="avanzado">Avanzado</SelectItem>
                <SelectItem value="elite">Élite</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Objetivo semanal (km)"><Input type="number" value={p.weekly_goal_km} onChange={(e) => set("weekly_goal_km", e.target.value)} /></Field>
        </div>

        <Field label="Bio"><Textarea value={p.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Cuéntanos sobre ti como atleta..." /></Field>

        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="font-display font-black text-2xl mt-1">{value}</div>
    </div>
  );
}
