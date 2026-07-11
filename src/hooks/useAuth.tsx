import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "student" | "visitor";

export interface Profile {
  id: string;
  full_name: string | null;
  university: string | null;
  faculty: string | null;
  study_year: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface Subscription {
  plan: "free" | "premium";
  status: "active" | "expired" | "canceled";
  current_period_end: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  subscription: Subscription | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDepositor: boolean;
  isVisitor: boolean;
  isPremium: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: roleRows }, { data: sub }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    setProfile((prof as Profile) ?? null);
    setRoles(((roleRows ?? []).map((r) => r.role) as AppRole[]) ?? []);
    setSubscription((sub as Subscription) ?? null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) {
      await loadUserData(data.session.user.id);
    }
  }, [loadUserData]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadUserData(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (sess?.user) {
        // Defer supabase calls out of the callback to avoid deadlocks.
        setTimeout(() => {
          loadUserData(sess.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setSubscription(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoles([]);
    setSubscription(null);
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    roles,
    subscription,
    loading,
    isAuthenticated: !!session?.user,
    isAdmin: roles.includes("admin"),
    isDepositor: roles.includes("student") || roles.includes("admin"),
    isVisitor:
      roles.includes("visitor") && !roles.includes("student") && !roles.includes("admin"),
    isPremium: subscription?.plan === "premium" && subscription?.status === "active",
    refresh,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
