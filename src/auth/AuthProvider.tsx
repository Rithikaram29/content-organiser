import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../data/supabaseClient";
import type { Profile } from "../data/dbTypes";
import type { Session } from "@supabase/supabase-js";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadProfile(userId: string) {
      try {
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, display_name, role")
          .eq("user_id", userId)
          .maybeSingle();

        if (pErr) {
          console.error("profiles fetch error", pErr);
          if (alive) setProfile(null);
          return;
        }

        if (alive) setProfile((p as Profile) ?? null);
      } catch (e) {
        console.error("profiles fetch threw", e);
        if (alive) setProfile(null);
      }
    }

    async function boot() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("auth.getSession error", error);
        if (!alive) return;

        const nextSession = data.session ?? null;
        setSession(nextSession);

        if (nextSession?.user?.id) {
          // Don't block app render on profile fetch
          void loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error("AuthProvider boot failed", e);
        setSession(null);
        setProfile(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        setSession(newSession);

        if (newSession?.user?.id) {
          // Don't block app render on profile fetch
          void loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}