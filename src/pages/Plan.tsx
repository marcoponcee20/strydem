import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Check, Trash2, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export default function Plan() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ scheduled_date: new Date().toISOString().slice(0, 10), sport: "running", title: "", description: "", target_distance_km: "", target_duration_minutes: "", intensity: "media" });

  const load = async () => {
    const { data } = await supabase.from("plan_items").select("*").order("scheduled_date");
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("plan_items").insert({
      user_id: user.id,
      scheduled_date: form.scheduled_date,
      sport: form.sport,
      title: form.title,
      description: form.description || null,
      target_distance_km: form.target_distance_km ? Number(form.target_distance_km) : null,
      target_duration_minutes: form.target_duration_minutes ? Number(form.target_duration_minutes) : null,
      intensity: form.intensity,
    });
    if (error) return toast.error(toUserMessage(error));
    toast.success("Sesión añadida al plan");
    setOpen(false);
    setForm({ ...form, title: "", description: "", target_distance_km: "", target_duration_minutes: "" });
    load();
  };

  const toggle = async (id: string, completed: boolean) => {
    await supabase.from("plan_items").update({ completed: !completed }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("plan_items").delete().eq("id", id);
    load();
  };

  const grouped = items.reduce((acc: Record<string, any[]>, it) => {
    (acc[it.scheduled_date] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Calendario</p>
          <h1 className="text-4xl">Plan de entrenamiento</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground font-semibold shadow-glow"><Plus className="mr-2 h-4 w-4" /> Añadir sesión</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva sesión planificada</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Fecha</Label><Input type="date" required value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Deporte</Label>
                  <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["running","ciclismo","natación","gym","trail"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Título</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ej. Series 5x1000" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Distancia (km)</Label><Input type="number" step="0.1" value={form.target_distance_km} onChange={(e) => setForm({ ...form, target_distance_km: e.target.value })} /></div>
                <div className="space-y-2"><Label>Duración (min)</Label><Input type="number" value={form.target_duration_minutes} onChange={(e) => setForm({ ...form, target_duration_minutes: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Intensidad</Label>
                <Select value={form.intensity} onValueChange={(v) => setForm({ ...form, intensity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["suave","media","fuerte","máxima"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Notas</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground">Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <CalIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Todavía no has planificado nada. Empieza tu plan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, list]) => (
            <div key={date} className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-display font-black uppercase text-sm tracking-widest">{new Date(date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</span>
              </div>
              <div className="space-y-2">
                {(list as any[]).map((it) => (
                  <div key={it.id} className={`flex items-center gap-3 p-3 rounded-lg border ${it.completed ? "bg-success/10 border-success/30" : "bg-secondary/40 border-border"}`}>
                    <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={() => toggle(it.id, it.completed)}>
                      <Check className={`h-4 w-4 ${it.completed ? "text-success" : "text-muted-foreground"}`} />
                    </Button>
                    <div className="flex-1">
                      <div className={`font-semibold ${it.completed ? "line-through text-muted-foreground" : ""}`}>{it.title}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span>{it.sport}</span>
                        {it.target_distance_km && <span>· {it.target_distance_km} km</span>}
                        {it.target_duration_minutes && <span>· {it.target_duration_minutes} min</span>}
                        {it.intensity && <span>· {it.intensity}</span>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
