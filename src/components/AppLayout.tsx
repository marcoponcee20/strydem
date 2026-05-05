import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { Activity, BarChart3, Calendar, LayoutDashboard, LogOut, User, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/app", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/app/workouts", label: "Entrenamientos", icon: Activity },
  { to: "/app/plan", label: "Plan", icon: Calendar },
  { to: "/app/stats", label: "Estadísticas", icon: BarChart3 },
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
      <aside className="md:w-64 md:min-h-screen border-b md:border-b-0 md:border-r border-border bg-card/40 backdrop-blur">
        <div className="p-6 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-black text-xl tracking-tight">PULSE</span>
        </div>
        <nav className="px-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-3 md:pb-0">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
        <div className="hidden md:block p-3 mt-auto">
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
