import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { GraduationCap, Loader2, Mail, Lock, UploadCloud, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  password: z.string().min(6, "6 caractères minimum").max(72),
});

/** Destination après connexion : les visiteurs vont vers la bibliothèque, les autres vers leur tableau de bord. */
function landingFor(roles: string[]): "/browse" | "/dashboard" {
  const isVisitorOnly =
    roles.includes("visitor") && !roles.includes("student") && !roles.includes("admin");
  return isVisitorOnly ? "/browse" : "/dashboard";
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { isAuthenticated, refresh, roles, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"student" | "visitor">("student");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    university: "",
    faculty: "",
    studyYear: "",
  });

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    navigate({ to: landingFor(roles), replace: true });
  }, [isAuthenticated, authLoading, roles, navigate]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email: form.email, password: form.password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!form.fullName.trim()) {
          toast.error("Veuillez indiquer votre nom complet");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Session is active (auto-confirm). Initialize profile + role securely.
        const { error: setupErr } = await supabase.rpc("setup_new_user", {
          _full_name: form.fullName.trim(),
          _university: form.university.trim(),
          _faculty: form.faculty.trim(),
          _study_year: form.studyYear.trim(),
          _role: role,
        });

        if (setupErr) console.error(setupErr);
        await refresh();
        toast.success("Compte créé avec succès. Bienvenue !");
        navigate({ to: role === "visitor" ? "/browse" : "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        await refresh();
        toast.success("Connexion réussie");
        // La redirection selon le rôle est gérée par l'effet une fois les rôles chargés.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(
        message.includes("Invalid login")
          ? "E-mail ou mot de passe incorrect"
          : message.includes("already registered")
            ? "Cette adresse est déjà utilisée"
            : message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    // Ensure account setup for OAuth users, then go to dashboard.
    await supabase.rpc("setup_new_user", {
      _full_name: "",
      _university: "",
      _faculty: "",
      _study_year: "",
    });

    await refresh();
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">MémoiresAcadémiques</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Vos travaux académiques, valorisés et sécurisés.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/85">
            Dépôt de mémoires, validation, recherche avancée et notifications — le tout sur une
            plateforme universitaire moderne.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} MémoiresAcadémiques
        </p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-gradient-subtle px-4 py-12">
        <Card className="w-full max-w-md border-border/60 p-8 shadow-soft">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-display font-bold">MémoiresAcadémiques</span>
          </div>
          <h1 className="font-display text-2xl font-bold">
            {mode === "signup" ? "Créer un compte" : "Connexion"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Rejoignez la plateforme en quelques secondes."
              : "Accédez à votre espace personnel."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon />
            Continuer avec Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            OU
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Jean Dupont"
                  maxLength={120}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="vous@universite.fr"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="university">Université</Label>
                  <Input
                    id="university"
                    value={form.university}
                    onChange={(e) => update("university", e.target.value)}
                    placeholder="Sorbonne"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faculty">Filière</Label>
                  <Input
                    id="faculty"
                    value={form.faculty}
                    onChange={(e) => update("faculty", e.target.value)}
                    placeholder="Informatique"
                    maxLength={120}
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Créer mon compte" : "Se connecter"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signup" ? "Se connecter" : "S'inscrire"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
