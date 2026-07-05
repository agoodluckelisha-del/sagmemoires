import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Crown, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Premium — MémoiresAcadémiques" },
      {
        name: "description",
        content:
          "Passez à l'offre Premium : dépôt illimité, téléchargement complet et accès avancé aux mémoires académiques.",
      },
      { property: "og:title", content: "Offre Premium — MémoiresAcadémiques" },
      {
        property: "og:description",
        content: "Dépôt illimité, téléchargements complets et accès avancé.",
      },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Gratuit",
    price: "0€",
    period: "toujours",
    highlight: false,
    features: [
      "Consultation des mémoires publics",
      "Recherche et filtres avancés",
      "Dépôt de 3 mémoires",
      "Notifications de base",
    ],
  },
  {
    name: "Premium",
    price: "9,99€",
    period: "par mois",
    highlight: true,
    features: [
      "Dépôt illimité de mémoires",
      "Téléchargement complet (Premium inclus)",
      "Accès avancé & prioritaire",
      "Support prioritaire",
      "Badge Premium sur vos dépôts",
    ],
  },
];

function PricingPage() {
  const { isAuthenticated, isPremium } = useAuth();
  const navigate = useNavigate();

  const handleChoose = (premium: boolean) => {
    if (!isAuthenticated) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    if (premium) navigate({ to: "/payments" });
    else navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="bg-gradient-hero py-16 text-center text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur">
            <Sparkles className="h-4 w-4" /> Tarifs simples et transparents
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold sm:text-5xl">
            Choisissez votre formule
          </h1>
          <p className="mt-4 text-primary-foreground/85">
            Commencez gratuitement, passez à Premium quand vous le souhaitez.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-10 w-full max-w-4xl flex-1 px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col p-8",
                plan.highlight
                  ? "border-primary/40 shadow-elegant ring-2 ring-primary/20"
                  : "border-border/60",
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary border-none text-primary-foreground">
                  <Crown className="mr-1 h-3 w-3" /> Recommandé
                </Badge>
              )}
              <h2 className="font-display text-xl font-bold">{plan.name}</h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/ {plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlight ? "hero" : "outline"}
                size="lg"
                className="mt-8"
                disabled={plan.highlight && isPremium}
                onClick={() => handleChoose(plan.highlight)}
              >
                {plan.highlight
                  ? isPremium
                    ? "Vous êtes Premium ✓"
                    : "Passer à Premium"
                  : "Commencer gratuitement"}
              </Button>
            </Card>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link to="/dashboard" className="font-medium text-primary hover:underline">
            Accéder à mon espace
          </Link>
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
