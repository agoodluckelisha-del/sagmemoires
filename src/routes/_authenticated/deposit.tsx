import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { UploadCloud, FileText, X, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createNotification, similarityScore } from "@/lib/notify";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/deposit")({
  component: DepositPage,
});

const FREE_LIMIT = 3;

const schema = z.object({
  title: z.string().trim().min(6, "Titre trop court").max(250),
  abstract: z.string().trim().min(40, "Résumé trop court (40 caractères min.)").max(5000),
});

function DepositPage() {
  const { user, profile, isPremium } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    abstract: "",
    keywords: "",
    faculty: profile?.faculty ?? "",
    university: profile?.university ?? "",
    year: String(new Date().getFullYear()),
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (f.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Le fichier dépasse 25 Mo");
      return;
    }
    setFile(f);
  };

  const checkDuplicates = async () => {
    const { data } = await supabase
      .from("theses")
      .select("title, abstract")
      .limit(500);
    const hit = (data ?? []).find(
      (t) =>
        similarityScore(t.title, form.title) > 0.6 ||
        similarityScore(t.abstract, form.abstract) > 0.55,
    );
    return hit ? hit.title : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!file) return toast.error("Veuillez sélectionner un fichier PDF");

    setLoading(true);
    setDupWarning(null);
    try {
      // Free plan limit
      if (!isPremium) {
        const { count } = await supabase
          .from("theses")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user!.id);
        if ((count ?? 0) >= FREE_LIMIT) {
          toast.error(
            `Limite gratuite atteinte (${FREE_LIMIT} mémoires). Passez à Premium pour un dépôt illimité.`,
          );
          setLoading(false);
          return;
        }
      }

      // Duplicate detection
      const dup = await checkDuplicates();
      if (dup) {
        setDupWarning(dup);
        toast.warning("Un mémoire similaire existe déjà — vérifiez avant de confirmer.");
        setLoading(false);
        return;
      }

      await performUpload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
      setLoading(false);
    }
  };

  const performUpload = async () => {
    setLoading(true);
    try {
      const ext = "pdf";
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("theses").upload(path, file!, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      const keywords = form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const { error: insErr } = await supabase.from("theses").insert({
        author_id: user!.id,
        title: form.title.trim(),
        abstract: form.abstract.trim(),
        keywords,
        faculty: form.faculty.trim() || null,
        university: form.university.trim() || null,
        year: Number(form.year) || null,
        author_name: profile?.full_name ?? null,
        file_path: path,
        file_size: file!.size,
        is_premium: isPremium,
        status: "pending",
      });
      if (insErr) throw insErr;

      await createNotification({
        userId: user!.id,
        type: "info",
        title: "Mémoire déposé",
        message: `« ${form.title.trim()} » a été soumis et est en attente de validation.`,
      });

      toast.success("Mémoire déposé avec succès !");
      navigate({ to: "/my-theses" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du dépôt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Déposer un mémoire" description="Soumettez votre travail au format PDF">
      <div className="mx-auto max-w-3xl">
        {dupWarning && (
          <Alert className="mb-6 border-warning/40 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle>Mémoire potentiellement similaire détecté</AlertTitle>
            <AlertDescription>
              Un mémoire proche existe déjà : « {dupWarning} ». Vous pouvez tout de même confirmer le
              dépôt si votre travail est bien distinct.
              <div className="mt-3">
                <Button size="sm" variant="hero" onClick={performUpload} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer le dépôt
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="border-border/60 p-6">
            {/* File dropzone */}
            <Label>Fichier PDF *</Label>
            <label
              className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-secondary"
              htmlFor="file"
            >
              {file ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} Mo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                    }}
                    className="rounded-full p-1 hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-9 w-9 text-primary" />
                  <p className="text-sm font-medium">Cliquez pour sélectionner un PDF</p>
                  <p className="text-xs text-muted-foreground">PDF uniquement · 25 Mo max</p>
                </>
              )}
              <input
                id="file"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre du mémoire *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Titre complet du mémoire"
                  maxLength={250}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abstract">Résumé *</Label>
                <Textarea
                  id="abstract"
                  value={form.abstract}
                  onChange={(e) => update("abstract", e.target.value)}
                  placeholder="Résumé / abstract du mémoire…"
                  rows={6}
                  maxLength={5000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Mots-clés</Label>
                <Input
                  id="keywords"
                  value={form.keywords}
                  onChange={(e) => update("keywords", e.target.value)}
                  placeholder="Séparés par des virgules : IA, réseaux, sécurité"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="faculty">Filière</Label>
                  <Input
                    id="faculty"
                    value={form.faculty}
                    onChange={(e) => update("faculty", e.target.value)}
                    placeholder="Informatique"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university">Université</Label>
                  <Input
                    id="university"
                    value={form.university}
                    onChange={(e) => update("university", e.target.value)}
                    placeholder="Sorbonne"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Année</Label>
                  <Input
                    id="year"
                    type="number"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    min={1970}
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="mt-6 w-full" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
              Soumettre le mémoire
            </Button>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
