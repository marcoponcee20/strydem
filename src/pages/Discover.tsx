import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, User as UserIcon } from "lucide-react";

export default function Discover() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_profiles", { q });
      setResults(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Comunidad</p>
        <h1 className="text-4xl">Descubre deportistas</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o usuario…"
          className="pl-9"
        />
      </div>

      <div className="grid gap-3">
        {results.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-10 text-center text-muted-foreground">
            {q ? "Sin resultados" : "Escribe para buscar usuarios"}
          </div>
        )}
        {results.map((u) => (
          <div key={u.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.full_name ?? "avatar"} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-primary grid place-items-center">
                <UserIcon className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{u.full_name || u.username || "Usuario"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {u.username ? `@${u.username}` : ""} {u.primary_sport ? `· ${u.primary_sport}` : ""}
              </div>
              {u.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{u.bio}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
