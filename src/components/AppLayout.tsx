import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { Activity, BarChart3, Calendar, LayoutDashboard, LogOut, User, Flame, Sparkles, Search, Trophy, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CommandPalette from "@/components/CommandPalette";

const prefetch: Record<string, () => Promise<unknown>> = {
  "/app": () => import("@/pages/Dashboard"),
  "/app/workouts": () => import("@/pages/Workouts"),
  "/app/records": () => import("@/pages/Records"),
  "/app/plan": () => import("@/pages/Plan"),
  "/app/stats": () => import("@/pages/Stats"),
  "/app/coach": () => import("@/pages/Coach"),
  "/app/discover": () => import("@/pages/Discover"),
  "/app/profile": () => import("@/pages/Profile"),
};

const links = [
  { to: "/app", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/app/workouts", label: "Entrenamientos", icon: Activity },
  { to: "/app/records", label: "Récords", icon: Trophy },
  { to: "/app/plan", label: "Plan", icon: Calendar },
  { to: "/app/stats", label: "Estadísticas", icon: BarChart3 },
  { to: "/app/coach", label: "Coach IA", icon: Sparkles },
  { to: "/app/discover", label: "Descubrir", icon: Search },
  { to: "/app/profile", label: "Perfil", icon: User },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-64 md:min-h-screen md:sticky md:top-0 md:self-start border-b md:border-b-0 md:border-r border-border bg-card/40 backdrop-blur flex flex-col">
        <div className="p-6 pb-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-black text-xl tracking-tight">STRYDE</span>
        </div>

        <div className="px-3 pb-3">
          <CommandPalette />
        </div>

        <nav className="px-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-3 md:pb-0">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onMouseEnter={() => { void prefetch[to]?.(); }}
              onTouchStart={() => { void prefetch[to]?.(); }}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition",
                  isActive
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pt-3 hidden md:block">
          <Button asChild className="w-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
            <NavLink to="/app/workouts/new"><Plus className="mr-2 h-4 w-4" /> Nuevo entreno</NavLink>
          </Button>
        </div>

        <div className="p-3 mt-auto">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-10 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
