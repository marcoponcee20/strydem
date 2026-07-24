import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { Flame } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase emits PASSWORD_RECOVERY when opening the recovery link.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also allow direct visits if a session already exists (link just processed).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(toUserMessage(error));
    toast.success("Contraseña actualizada");
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md space-y-6 bg-surface border border-border rounded-2xl p-8">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-black text-xl">STRYDE</span>
        </div>
        <div>
          <h1 className="text-3xl">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground">
            {ready ? "Elige una nueva contraseña para tu cuenta." : "Validando enlace de recuperación…"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Contraseña nueva</Label>
            <Input id="new-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} />
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full bg-gradient-primary text-primary-foreground font-semibold">
            {loading ? "Guardando..." : "Actualizar contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
