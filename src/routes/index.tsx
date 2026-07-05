import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  ShieldCheck,
  Search,
  Bell,
  CreditCard,
  FileCheck2,
  BookOpen,
  ArrowRight,
  Users,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteHeader";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

const features = [
  {
    icon: UploadCloud,
    title: "Dépôt de mémoires",
    desc: "Soumettez vos mémoires au format PDF en quelques clics et suivez leur statut en temps réel.",
  },
  {
    icon: ShieldCheck,
    title: "Validation académique",
    desc: "Chaque mémoire est examiné et validé ou rejeté par un administrateur avec motif détaillé.",
  },
  {
    icon: Search,
    title: "Recherche avancée",
    desc: "Filtrez par titre, auteur, mot-clé, filière, université ou année d'obtention.",
  },
  {
    icon: FileCheck2,
    title: "Détection de doublons",
    desc: "Un contrôle de similarité alerte lors du dépôt de titres ou résumés trop proches.",
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Recevez une alerte à chaque dépôt, validation, rejet ou paiement traité.",
  },
  {
    icon: CreditCard,
    title: "Accès Premium",
    desc: "Débloquez le dépôt illimité, le téléchargement complet et l'accès avancé.",
  },
];

const roleCards = [
  {
    title: "Déposant",
    subtitle: "Étudiant",
    points: ["Déposer des mémoires PDF", "Suivre le statut", "Recevoir des notifications"],
  },
  {
    title: "Visiteur",
    subtitle: "Lecteur",
    points: ["Consulter les mémoires publics", "Rechercher & filtrer", "Télécharger les documents"],
  },
  {
    title: "Administrateur",
    subtitle: "Superviseur",
    points: ["Valider / rejeter", "Gérer les utilisateurs", "Statistiques globales"],
  },
];

function Index() {
  const { data: stats } = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const { count } = await supabase
        .from("theses")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("is_public", true);
      return { theses: count ?? 0 };
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 opacity-40">
          <img
            src={heroImg}
            alt="Bibliothèque numérique de mémoires académiques"
            className="h-full w-full object-cover"
            width={1536}
            height={1024}
          />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28 lg:px-8">
          <div className="text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Plateforme universitaire nouvelle génération
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              La gestion électronique des mémoires académiques
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/85">
              Déposez, consultez, validez et partagez des mémoires universitaires sur une plateforme
              sécurisée, rapide et élégante.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="xl" className="bg-white text-primary hover:bg-white/90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Commencer gratuitement
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/browse">Explorer les mémoires</Link>
              </Button>
            </div>
            <div className="mt-10 flex gap-8">
              <div>
                <p className="font-display text-3xl font-bold">{stats?.theses ?? 0}+</p>
                <p className="text-sm text-primary-foreground/75">Mémoires publiés</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold">3</p>
                <p className="text-sm text-primary-foreground/75">Rôles gérés</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold">100%</p>
                <p className="text-sm text-primary-foreground/75">Sécurisé</p>
              </div>
            </div>
          </div>
          <div className="hidden lg:block" />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Tout ce qu'il faut pour gérer vos mémoires
          </h2>
          <p className="mt-4 text-muted-foreground">
            Une suite complète pensée pour les étudiants, les universités et les chercheurs.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-soft"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Conçu pour chaque profil</h2>
            <p className="mt-4 text-muted-foreground">
              Un système de rôles complet pour chaque usage de la plateforme.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {roleCards.map((r, i) => (
              <Card key={r.title} className="relative overflow-hidden border-border/60 p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                    {i === 0 ? (
                      <UploadCloud className="h-5 w-5" />
                    ) : i === 1 ? (
                      <BookOpen className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {r.subtitle}
                    </p>
                    <h3 className="text-lg font-semibold">{r.title}</h3>
                  </div>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCheck2 className="h-4 w-4 text-accent" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero px-8 py-16 text-center text-primary-foreground shadow-elegant">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Prêt à valoriser vos travaux académiques ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
            Rejoignez la plateforme et déposez votre premier mémoire dès aujourd'hui.
          </p>
          <Button asChild size="xl" className="mt-8 bg-white text-primary hover:bg-white/90">
            <Link to="/auth" search={{ mode: "signup" }}>
              Créer mon compte
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
