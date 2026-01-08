import { useEffect, useState } from "react";
import { supabase } from "../data/supabaseClient";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { session } = useAuth();

  // If already logged in, don't stay on the login page
  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(
          "Account created. If email confirmation is enabled in Supabase Auth settings, check your inbox to confirm before signing in."
        );
        setMode("login");
        setPassword("");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Authentication error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 8,
              }}
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Content Organiser
          </div>
          <p className="login-subtitle">
            {mode === "login" ? "Sign in to manage your content" : "Create an internal account"}
          </p>
        </div>

        {message ? (
          <div className="login-success">
            <svg
              className="login-success-icon"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3 className="login-success-title">{mode === "login" ? "Sign in" : "Sign up"}</h3>
            <p className="login-success-text">{message}</p>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <button type="submit" className="btn-lg" disabled={loading} style={{ width: "100%" }}>
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: 16, height: 16 }}></span>
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M4 12h11" />
                  <path d="M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0z" />
                </svg>
                {mode === "login" ? "Sign in" : "Sign up"}
              </>
            )}
          </button>

          <div style={{ marginTop: 12, textAlign: "center" }}>
            {mode === "login" ? (
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setMessage(null);
                  setMode("signup");
                }}
              >
                Need an account? Sign up
              </button>
            ) : (
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setMessage(null);
                  setMode("login");
                }}
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </form>

        <p style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
          Tip: For internal-only access, disable public signups in Supabase Auth and create users from the dashboard.
        </p>
      </div>
    </div>
  );
}
