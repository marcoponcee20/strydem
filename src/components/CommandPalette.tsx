import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useWorkouts } from "@/hooks/useWorkouts";
import { sportLabel } from "@/lib/sportConfig";
import { Activity, BarChart3, Calendar, LayoutDashboard, Plus, Search, Sparkles, Trophy, User } from "lucide-react";

const NAV = [
  { to: "/app", label: "Resumen", icon: LayoutDashboard },
  { to: "/app/workouts", label: "Entrenamientos", icon: Activity },
  { to: "/app/workouts/new", label: "Registrar entrenamiento", icon: Plus },
  { to: "/app/records", label: "Récords y logros", icon: Trophy },
  { to: "/app/plan", label: "Plan", icon: Calendar },
  { to: "/app/stats", label: "Estadísticas", icon: BarChart3 },
  { to: "/app/coach", label: "Coach IA", icon: Sparkles },
  { to: "/app/discover", label: "Descubrir atletas", icon: Search },
  { to: "/app/profile", label: "Perfil", icon: User },
];


export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: workouts = [] } = useWorkouts();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => { setOpen(false); navigate(to); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/40 text-muted-foreground text-xs hover:border-primary/50 transition"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="hidden md:inline text-[10px] border border-border rounded px-1 py-0.5">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Busca páginas o entrenamientos…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Ir a">
            {NAV.map(({ to, label, icon: Icon }) => (
              <CommandItem key={to} value={label} onSelect={() => go(to)}>
                <Icon className="mr-2 h-4 w-4" /> {label}
              </CommandItem>
            ))}
          </CommandGroup>
          {workouts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Entrenamientos recientes">
                {workouts.slice(0, 12).map((w) => (
                  <CommandItem
                    key={w.id}
                    value={`${w.title || ""} ${sportLabel(w.sport)} ${w.workout_date}`}
                    onSelect={() => go("/app/workouts")}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    <span className="truncate">{w.title || `Sesión de ${sportLabel(w.sport)}`}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(w.workout_date).toLocaleDateString("es", { day: "numeric", month: "short" })}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
