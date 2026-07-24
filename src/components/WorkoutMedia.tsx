import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Trash2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

type MediaItem = { id: string; storage_path: string; mime_type: string | null; kind: string; url?: string };

export default function WorkoutMedia({ workoutId }: { workoutId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("workout_media")
      .select("*")
      .eq("workout_id", workoutId)
      .order("created_at", { ascending: false });
    const withUrls = await Promise.all(
      (data || []).map(async (m: any) => {
        const { data: signed } = await supabase.storage.from("workout-media").createSignedUrl(m.storage_path, 3600);
        return { ...m, url: signed?.signedUrl };
      })
    );
    setItems(withUrls);
  };

  useEffect(() => { load(); }, [workoutId]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${workoutId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("workout-media").upload(path, file, { contentType: file.type });
      if (upErr) { toast.error(upErr.message); continue; }
      const kind = file.type.startsWith("video") ? "video" : "image";
      const { error: insErr } = await supabase.from("workout_media").insert({
        workout_id: workoutId, user_id: user.id, storage_path: path, mime_type: file.type, kind,
      });
      if (insErr) toast.error(insErr.message);
    }
    setUploading(false);
    e.target.value = "";
    toast.success("Multimedia subida");
    load();
  };

  const remove = async (m: MediaItem) => {
    await supabase.storage.from("workout-media").remove([m.storage_path]);
    await supabase.from("workout_media").delete().eq("id", m.id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Multimedia</h3>
        <label>
          <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onUpload} disabled={uploading} />
          <Button asChild size="sm" variant="outline" disabled={uploading}>
            <span className="cursor-pointer"><Upload className="h-4 w-4 mr-2" /> {uploading ? "Subiendo..." : "Añadir"}</span>
          </Button>
        </label>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin fotos ni vídeos.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {items.map((m) => (
            <div key={m.id} className="relative group aspect-square rounded-lg overflow-hidden bg-secondary">
              {m.kind === "video" ? (
                <video src={m.url} controls className="w-full h-full object-cover" />
              ) : (
                <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
              )}
              <Button
                size="icon"
                variant="destructive"
                onClick={() => remove(m)}
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1">
                {m.kind === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
