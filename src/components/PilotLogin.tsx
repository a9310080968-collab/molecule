import { LoaderCircle, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { useState } from "react";

type PilotLoginProps = {
  loading?: boolean;
  onLogin: (email: string, password: string) => Promise<string | null>;
};

export function PilotLogin({ loading = false, onLogin }: PilotLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="demo-login-shell">
        <div className="cosmos-backdrop" />
        <main className="demo-login-panel pilot-login-loading glass-panel" aria-live="polite">
          <LoaderCircle className="spin" size={24} />
          <strong>Checking your session</strong>
        </main>
      </div>
    );
  }

  return (
    <div className="demo-login-shell">
      <div className="cosmos-backdrop" />
      <main className="demo-login-panel pilot-login-panel glass-panel">
        <header>
          <div className="demo-login-brand">
            <span><UserRound size={18} /></span>
            <div>
              <b>Molecule</b>
              <small>Company workspace</small>
            </div>
          </div>
          <h1>Sign in</h1>
        </header>
        <form
          className="demo-login-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            setError("");
            const message = await onLogin(email.trim(), password);
            if (message) setError(message);
            setSubmitting(false);
          }}
        >
          <label>
            <span>Work email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label>
            <span>Password</span>
            <div className="demo-password-field">
              <LockKeyhole size={16} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </label>
          {error ? <p className="demo-login-error" role="alert">{error}</p> : null}
          <button className="demo-login-submit" type="submit" disabled={submitting || !email.trim() || !password}>
            {submitting ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
