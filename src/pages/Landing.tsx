import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, Calendar, BarChart3, Flame, ArrowRight, Heart, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-runner.jpg";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const features = [
  { icon: Activity, title: "Registra cada zancada", desc: "Distancia, ritmo, FC, calorías y desnivel en una sola pantalla." },
  { icon: Calendar, title: "Plan de entrenamiento", desc: "Organiza tus sesiones por día, marca completadas y mantén el ritmo." },
  { icon: BarChart3, title: "Progreso visual", desc: "Gráficas, totales semanales y récords personales que te empujan." },
  { icon: Heart, title: "Datos personales", desc: "Edad, IMC, FC máx, nivel y objetivos — todo en tu perfil." },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<{ athletes: number; total_km: number; total_workouts: number } | null>(null);

  useEffect(() => {
    supabase.from("public_stats").select("*").maybeSingle().then(({ data }) => {
      if (data) setStats({
        athletes: Number(data.athletes) || 0,
        total_km: Number(data.total_km) || 0,
        total_workouts: Number(data.total_workouts) || 0,
      });
    });
  }, []);

  if (!loading && user) return <Navigate to="/app" replace />;

  const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${n}`;
  const fmtKm = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${Math.round(n)}`;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="container mx-auto flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-black text-xl tracking-tight">STRYDE</span>
        </div>
        <Button asChild variant="ghost">
          <Link to={user ? "/app" : "/auth"}>{user ? "Mi panel" : "Entrar"}</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="container mx-auto grid lg:grid-cols-2 gap-12 items-center py-12 lg:py-20">
        <div className="animate-slide-up space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-semibold uppercase tracking-widest">
            <Zap className="h-3.5 w-3.5 text-primary" /> Tu entrenamiento, sin excusas
          </div>
          <h1 className="text-5xl md:text-7xl leading-[0.95]">
            Corre. Mide. <span className="text-gradient">Supérate.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            La app definitiva para runners y deportistas. Registra entrenamientos, sigue tu progreso
            y domina cada kilómetro con un plan que se adapta a ti.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow font-semibold">
              <Link to={user ? "/app" : "/auth"}>
                Empieza gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Ver funciones</a>
            </Button>
          </div>
          <div className="flex gap-8 pt-6">
            <Stat n={stats ? fmt(stats.athletes) : "—"} l="atletas" />
            <Stat n={stats ? fmtKm(stats.total_km) : "—"} l="km registrados" />
            <Stat n={stats ? fmt(stats.total_workouts) : "—"} l="entrenos" />
          </div>
        </div>
        <div className="relative animate-slide-up">
          <div className="absolute -inset-6 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
          <img src={hero} alt="Atleta corriendo al atardecer" width={1600} height={1024}
            className="relative rounded-3xl shadow-card border border-border" />
          <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-2xl p-4 shadow-card animate-pulse-glow">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 grid place-items-center">
                <Heart className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pulsaciones</div>
                <div className="font-display font-black text-2xl">162 <span className="text-xs text-muted-foreground font-sans font-normal">bpm</span></div>
              </div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 bg-card border border-border rounded-2xl p-4 shadow-card hidden md:block">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Récord 10K</div>
                <div className="font-display font-black text-xl">42:18</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="text-4xl md:text-5xl mb-4">Todo lo que necesitas, <span className="text-gradient">nada que sobre</span></h2>
          <p className="text-muted-foreground">Diseñado por runners para runners. Cada métrica importa, cada sesión cuenta.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={f.title} className="bg-surface border border-border rounded-2xl p-6 hover:border-primary/50 transition group">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center mb-4 group-hover:scale-110 transition shadow-glow">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto py-20">
        <div className="bg-gradient-primary rounded-3xl p-12 md:p-16 text-center shadow-glow">
          <h2 className="text-4xl md:text-6xl text-primary-foreground mb-4">Tu próximo PR te está esperando</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8">Únete gratis y empieza a registrar tus entrenamientos en menos de un minuto.</p>
          <Button asChild size="lg" variant="secondary" className="font-semibold">
            <Link to={user ? "/app" : "/auth"}>Crear mi cuenta <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="container mx-auto py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} STRYDE — Hecho con sudor y código.
      </footer>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display font-black text-2xl md:text-3xl">{n}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{l}</div>
    </div>
  );
}
