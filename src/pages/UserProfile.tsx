import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User as UserIcon, Trophy, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("public_profiles").select("*").eq("id", id).maybeSingle();
      setProfile(data ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-muted-foreground">Cargando…</div>;
  if (!profile) return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link to="/app/discover"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link></Button>
      <div className="bg-surface border border-border rounded-2xl p-10 text-center text-muted-foreground">Perfil no encontrado</div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/discover"><ArrowLeft className="h-4 w-4 mr-2" />Volver a buscar</Link>
      </Button>

      <div className="bg-surface border border-border rounded-2xl p-8 flex items-center gap-6">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.full_name ?? ""} className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="h-24 w-24 rounded-full bg-gradient-primary grid place-items-center">
            <UserIcon className="h-10 w-10 text-primary-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-3xl truncate">{profile.full_name || profile.username || "Usuario"}</h1>
          {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
          {profile.bio && <p className="text-sm mt-2 text-muted-foreground">{profile.bio}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat icon={Activity} label="Deporte" value={profile.primary_sport || "—"} />
        <Stat icon={Trophy} label="Nivel" value={profile.fitness_level || "—"} />
        <Stat icon={Activity} label="Objetivo semanal" value={profile.weekly_goal_km ? `${profile.weekly_goal_km} km` : "—"} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="font-display text-xl mt-1 capitalize">{value}</div>
    </div>
  );
}
