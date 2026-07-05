import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Download, UploadCloud, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/notify";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/my-theses")({
  component: MyTheses,
});

function MyTheses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: theses = [], isLoading } = useQuery({
    queryKey: ["my-theses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theses")
        .select("*")
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string, filePath: string) => {
    const { error } = await supabase.from("theses").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible");
    await supabase.storage.from("theses").remove([filePath]);
    toast.success("Mémoire supprimé");
    qc.invalidateQueries({ queryKey: ["my-theses"] });
  };

  const handleDownload = async (filePath: string, id: string) => {
    setDownloadingId(id);
    const { data, error } = await supabase.storage.from("theses").createSignedUrl(filePath, 600);
    setDownloadingId(null);
    if (error || !data) return toast.error("Téléchargement impossible");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <DashboardLayout
      title="Mes mémoires"
      description="Gérez vos dépôts et suivez leur validation"
      actions={
        <Button asChild variant="hero" size="sm">
          <Link to="/deposit">
            <UploadCloud className="h-4 w-4" /> Déposer
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Chargement…</p>
      ) : theses.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-border/60 p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Vous n'avez pas encore déposé de mémoire.</p>
          <Button asChild variant="hero">
            <Link to="/deposit">
              <UploadCloud className="h-4 w-4" /> Déposer mon premier mémoire
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {theses.map((t) => (
            <Card key={t.id} className="border-border/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{t.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.abstract}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(t.created_at)}</span>
                      {t.faculty && <span>· {t.faculty}</span>}
                      {t.year && <span>· {t.year}</span>}
                      <span className="flex items-center gap-1">
                        · <Download className="h-3 w-3" /> {t.downloads}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={t.status} />
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(t.file_path, t.id)}
                      disabled={downloadingId === t.id}
                    >
                      {downloadingId === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce mémoire ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Le fichier PDF sera également supprimé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(t.id, t.file_path)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              {t.status === "rejected" && t.rejection_reason && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>
                    <strong>Motif du rejet :</strong> {t.rejection_reason}
                  </span>
                </div>
              )}
              {t.is_premium && (
                <Badge className="mt-3 bg-gradient-primary border-none text-primary-foreground">
                  Premium
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
