import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { accountByUsername, SCHOOL_ACCOUNTS } from '../data/schools.js';

export default function AuthScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const account = accountByUsername(username);
    if (!account) {
      setError(`Use one of: ${SCHOOL_ACCOUNTS.map((a) => a.username).join(', ')}`);
      setSubmitting(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password,
    });

    if (authError) {
      setError(authError.message);
    }

    setSubmitting(false);
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-heading">
          <span className="app-title-mark">TCRS</span>
          <h1>Conduct &amp; Indent Scheduler</h1>
          <p>Sign in with your school account (SCH1–SCH4).</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="auth-username">
            School account
          </label>
          <input
            id="auth-username"
            className="text-input"
            type="text"
            autoComplete="username"
            placeholder="SCH1"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <label className="form-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className="text-input"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && <div className="status-message status-error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
