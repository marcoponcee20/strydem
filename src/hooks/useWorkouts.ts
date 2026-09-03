import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { WorkoutRow } from "@/lib/analytics";

/** Cached workouts feed — shared across pages so navigation feels instant. */
export function useWorkouts() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["workouts", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<WorkoutRow[]> => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("workout_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WorkoutRow[];
    },
  });
  return query;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
}

export function useInvalidateWorkouts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["workouts"] });
}
