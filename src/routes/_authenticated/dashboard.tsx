import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Crown,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/notify";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, profile, isAdmin, isPremium } = useAuth();

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: theses } = await supabase
        .from("theses")
        .select("id, title, status, downloads, created_at")
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false });
      const rows = theses ?? [];
      return {
        theses: rows,
        total: rows.length,
        pending: rows.filter((t) => t.status === "pending").length,
        approved: rows.filter((t) => t.status === "approved").length,
        rejected: rows.filter((t) => t.status === "rejected").length,
        downloads: rows.reduce((s, t) => s + (t.downloads ?? 0), 0),
      };
    },
  });

  const stats = [
    { label: "Total mémoires", value: data?.total ?? 0, icon: FileText, color: "text-primary" },
    { label: "En attente", value: data?.pending ?? 0, icon: Clock, color: "text-warning" },
    { label: "Validés", value: data?.approved ?? 0, icon: CheckCircle2, color: "text-success" },
    { label: "Téléchargements", value: data?.downloads ?? 0, icon: Download, color: "text-accent" },
  ];

  return (
    <DashboardLayout
      title={`Bonjour, ${profile?.full_name?.split(" ")[0] || "bienvenue"} 👋`}
      description="Voici un aperçu de votre activité"
      actions={
        <Button asChild variant="hero" size="sm">
          <Link to="/deposit">
            <UploadCloud className="h-4 w-4" /> Déposer
          </Link>
        </Button>
      }
    >
      {!isPremium && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-primary/30 bg-gradient-primary p-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6" />
            <div>
              <p className="font-semibold">Passez à Premium</p>
              <p className="text-sm text-primary-foreground/85">
                Dépôt illimité, téléchargements complets et accès avancé.
              </p>
            </div>
          </div>
          <Button asChild className="bg-white text-primary hover:bg-white/90">
            <Link to="/payments">Voir les offres</Link>
          </Button>
        </Card>
      )}

      {isAdmin && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-border/60 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Espace administrateur</p>
              <p className="text-sm text-muted-foreground">
                Validez les mémoires, gérez les utilisateurs et consultez les statistiques.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin">
              Ouvrir <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-border/60">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <h2 className="font-semibold">Mes derniers mémoires</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/my-theses">
              Tout voir <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {data?.theses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas encore déposé de mémoire.
            </p>
            <Button asChild variant="hero" size="sm">
              <Link to="/deposit">
                <UploadCloud className="h-4 w-4" /> Déposer mon premier mémoire
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {data?.theses.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardLayout>
  );
}
