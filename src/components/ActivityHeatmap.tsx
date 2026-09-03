import { useMemo } from "react";
import { buildHeatmap, type WorkoutRow } from "@/lib/analytics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function ActivityHeatmap({ workouts, weeks = 27 }: { workouts: WorkoutRow[]; weeks?: number }) {
  const days = useMemo(() => buildHeatmap(workouts, weeks), [workouts, weeks]);

  const maxMin = Math.max(30, ...days.map((d) => d.minutes));
  const level = (min: number) => {
    if (min <= 0) return 0;
    const r = min / maxMin;
    if (r < 0.25) return 1;
    if (r < 0.5) return 2;
    if (r < 0.75) return 3;
    return 4;
  };
  const tone = ["bg-secondary/60", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"];

  // group into columns of 7 (weeks, Monday first)
  const cols: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-xl">Constancia</h3>
        <span className="text-xs text-muted-foreground">{activeDays} días activos en los últimos {weeks * 7} días</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1 min-w-full">
          <div className="flex gap-[3px] pl-7 text-[10px] text-muted-foreground">
            {cols.map((c, i) => {
              const first = c[0] ? new Date(c[0].date) : null;
              const show = first && first.getDate() <= 7;
              return <span key={i} className="w-[13px] shrink-0">{show ? MONTHS[first!.getMonth()] : ""}</span>;
            })}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] text-[10px] text-muted-foreground w-6 shrink-0">
              {["L", "", "X", "", "V", "", "D"].map((d, i) => (
                <span key={i} className="h-[13px] leading-[13px]">{d}</span>
              ))}
            </div>
            {cols.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px] shrink-0">
                {col.map((d) => (
                  <Tooltip key={d.date}>
                    <TooltipTrigger asChild>
                      <div className={`h-[13px] w-[13px] rounded-[3px] ${tone[level(d.minutes)]} transition hover:ring-1 hover:ring-primary`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-semibold">{new Date(d.date).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })}</div>
                        {d.count === 0 ? "Descanso" : `${d.count} ${d.count === 1 ? "sesión" : "sesiones"} · ${Math.round(d.minutes)} min${d.km > 0 ? ` · ${d.km.toFixed(1)} km` : ""}`}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
        <span>Menos</span>
        {tone.map((t, i) => <span key={i} className={`h-[11px] w-[11px] rounded-[3px] ${t}`} />)}
        <span>Más</span>
      </div>
    </div>
  );
}
