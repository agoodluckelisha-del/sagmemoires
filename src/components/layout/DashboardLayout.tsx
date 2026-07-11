import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  GraduationCap,
  LayoutDashboard,
  UploadCloud,
  FileText,
  Search,
  Bell,
  CreditCard,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Menu,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const baseItems: NavItem[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/browse", label: "Explorer", icon: Search },
  { to: "/deposit", label: "Déposer un mémoire", icon: UploadCloud },
  { to: "/my-theses", label: "Mes mémoires", icon: FileText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/payments", label: "Paiements", icon: CreditCard },
  { to: "/profile", label: "Mon profil", icon: UserIcon },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, roles, isAdmin, isVisitor, isPremium, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = baseItems.filter(
    (item) => !(isVisitor && (item.to === "/deposit" || item.to === "/my-theses")),
  );
  if (isAdmin) {
    items.push({ to: "/admin", label: "Administration", icon: ShieldCheck });
  }

  const handleSignOut = async () => {
    await signOut();
    onNavigate?.();
    navigate({ to: "/auth", replace: true });
  };

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex h-full flex-col bg-gradient-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="font-display text-base font-bold">MémoiresAcad.</span>
      </div>

      <div className="mx-3 mb-4 rounded-xl bg-sidebar-accent/60 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {profile?.full_name || "Utilisateur"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">{user?.email}</p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <Badge
              key={r}
              variant="secondary"
              className="bg-sidebar-primary/20 text-sidebar-foreground border-none text-[10px] uppercase tracking-wide"
            >
              {r === "admin" ? "Admin" : r === "student" ? "Déposant" : "Visiteur"}
            </Badge>
          ))}
          {isPremium && (
            <Badge className="bg-gradient-primary border-none text-[10px] uppercase tracking-wide text-primary-foreground">
              Premium
            </Badge>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active =
            pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4.5 w-4.5" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

export function DashboardLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (active) setUnread(count ?? 0);
    };
    load();
    const channel = supabase
      .channel("nav-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex min-h-screen bg-gradient-subtle">
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="fixed h-screen w-72">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-lg sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-none p-0">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight sm:text-xl">{title}</h1>
              {description && (
                <p className="hidden text-sm text-muted-foreground sm:block">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link to="/notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            </Button>
            {actions}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
