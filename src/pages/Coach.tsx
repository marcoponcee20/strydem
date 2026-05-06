import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { formatDuration, formatPace } from "@/lib/sport";

type Msg = { role: "user" | "assistant"; content: string };

export default function Coach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "¡Hola! Soy tu coach 🔥. Puedo analizar tus entrenos, sugerirte mejoras o ayudarte a planificar el próximo. ¿Qué quieres saber?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [{ data: profile }, { data: workouts }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("workouts").select("*").order("workout_date", { ascending: false }).limit(15),
      ]);
      const p = profile
        ? `Perfil: ${profile.full_name ?? "—"}, deporte principal ${profile.primary_sport ?? "—"}, nivel ${profile.fitness_level ?? "—"}, peso ${profile.weight_kg ?? "—"} kg, altura ${profile.height_cm ?? "—"} cm, FC reposo ${profile.resting_hr ?? "—"}, FC máx ${profile.max_hr ?? "—"}, objetivo semanal ${profile.weekly_goal_km ?? "—"} km.`
        : "Perfil sin completar.";
      const w = (workouts ?? []).map((x: any) => `- ${x.workout_date} · ${x.sport} · ${x.title ?? ""} · ${x.distance_km ?? "?"} km · ${formatDuration(x.duration_seconds)} · ritmo ${formatPace(x.pace_seconds_per_km)} · esfuerzo ${x.perceived_effort ?? "?"}/10${x.notes ? ` · "${x.notes}"` : ""}`).join("\n");
      setContext(`${p}\n\nÚltimos entrenamientos:\n${w || "(ninguno)"}`);
    })();
  }, [user]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: next, context }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        setMessages((m) => [...m, { role: "assistant", content: err.error || "Error al contactar con el coach." }]);
        setLoading(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: assistant }; return c; });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: "Fallo: " + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Coach IA</p>
        <h1 className="text-4xl flex items-center gap-3"><Sparkles className="h-8 w-8 text-primary" /> Pregunta a tu coach</h1>
        <p className="text-muted-foreground mt-2">Analiza tus últimos entrenos y te ayuda a mejorar.</p>
      </div>

      <div ref={scrollRef} className="bg-surface border border-border rounded-2xl p-4 h-[60vh] overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {m.content || (loading && i === messages.length - 1 ? "…" : "")}
            </div>
            {m.role === "user" && (
              <div className="h-8 w-8 rounded-lg bg-secondary grid place-items-center shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ej: ¿Cómo mejoro mi ritmo en 10K?"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
