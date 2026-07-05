import { Link } from "@tanstack/react-router";
import { GraduationCap, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { to: "/", label: "Accueil" },
  { to: "/browse", label: "Explorer" },
  { to: "/pricing", label: "Premium" },
];

export function SiteHeader() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Mémoires<span className="text-gradient">Académiques</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "!text-foreground bg-secondary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Button asChild variant="hero" size="sm">
              <Link to="/dashboard">Mon espace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Connexion</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  S'inscrire
                </Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="mt-8 flex flex-col gap-2">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                {isAuthenticated ? (
                  <Button asChild variant="hero" onClick={() => setOpen(false)}>
                    <Link to="/dashboard">Mon espace</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link to="/auth">Connexion</Link>
                    </Button>
                    <Button asChild variant="hero" onClick={() => setOpen(false)}>
                      <Link to="/auth" search={{ mode: "signup" }}>
                        S'inscrire
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="font-display font-bold">MémoiresAcadémiques</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MémoiresAcadémiques. Plateforme sécurisée de gestion des
            mémoires.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/browse" className="hover:text-foreground">
              Explorer
            </Link>
            <Link to="/pricing" className="hover:text-foreground">
              Premium
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
