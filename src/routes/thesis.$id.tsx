import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  FileText,
  Download,
  ArrowLeft,
  Crown,
  Calendar,
  Building2,
  BookOpen,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicThesisUrl, getPremiumThesisUrl } from "@/lib/downloads.functions";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/notify";
import { toast } from "sonner";

export const Route = createFileRoute("/thesis/$id")({
  component: ThesisDetail,
});

function ThesisDetail() {
  const { id } = Route.useParams();
  const { isAuthenticated, isPremium } = useAuth();
  const navigate = useNavigate();
  const publicUrl = useServerFn(getPublicThesisUrl);
  const premiumUrl = useServerFn(getPremiumThesisUrl);
  const [downloading, setDownloading] = useState(false);

  const { data: thesis, isLoading } = useQuery({
    queryKey: ["thesis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theses")
        .select("*")
        .eq("id", id)
        .eq("status", "approved")
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleDownload = async () => {
    if (!thesis) return;
    setDownloading(true);
    try {
      let res: { url: string };
      if (thesis.is_premium) {
        if (!isAuthenticated) {
          toast.error("Connectez-vous pour accéder à ce mémoire Premium");
          navigate({ to: "/auth" });
          return;
        }
        res = await premiumUrl({ data: { id: thesis.id } });
      } else {
        res = await publicUrl({ data: { id: thesis.id } });
      }
      window.open(res.url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Téléchargement impossible");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/browse">
            <ArrowLeft className="h-4 w-4" /> Retour à l'exploration
          </Link>
        </Button>

        {isLoading ? (
          <p className="py-20 text-center text-muted-foreground">Chargement…</p>
        ) : !thesis ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Ce mémoire est introuvable ou non public.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft">
                <FileText className="h-7 w-7" />
              </span>
              <div className="flex-1">
                {thesis.is_premium && (
                  <Badge className="mb-2 bg-gradient-primary border-none text-primary-foreground">
                    <Crown className="mr-1 h-3 w-3" /> Premium
                  </Badge>
                )}
                <h1 className="font-display text-2xl font-bold sm:text-3xl">{thesis.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Déposé le {formatDate(thesis.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetaItem icon={UserIcon} label="Auteur" value={thesis.author_name || "Anonyme"} />
              <MetaItem icon={Building2} label="Université" value={thesis.university || "—"} />
              <MetaItem icon={BookOpen} label="Filière" value={thesis.faculty || "—"} />
              <MetaItem
                icon={Calendar}
                label="Année"
                value={thesis.year ? String(thesis.year) : "—"}
              />
            </div>

            <Card className="mt-6 border-border/60 p-6">
              <h2 className="text-lg font-semibold">Résumé</h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {thesis.abstract}
              </p>
              {thesis.keywords?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {thesis.keywords.map((k: string) => (
                    <Badge key={k} variant="secondary">
                      {k}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="hero" size="lg" onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                Télécharger le PDF
              </Button>
              {thesis.is_premium && !isPremium && (
                <span className="text-sm text-muted-foreground">
                  Accès Premium requis —{" "}
                  <Link to="/pricing" className="font-medium text-primary hover:underline">
                    voir les offres
                  </Link>
                </span>
              )}
              <span className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
                <Download className="h-4 w-4" /> {thesis.downloads} téléchargement
                {thesis.downloads > 1 ? "s" : ""}
              </span>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}
