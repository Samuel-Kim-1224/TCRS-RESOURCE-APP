import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { SCHOOL_ACCOUNTS } from '../data/schools.js';
import { schoolColor } from '../data/companies.js';

export default function AuthScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const account = SCHOOL_ACCOUNTS.find((a) => a.username === username);
    if (!account) {
      setError('Select SCH1, SCH2, SCH3, or SCH4.');
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
          <p>Select your school, then enter the password.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-label">School account</label>
          <div className="auth-school-grid" role="group" aria-label="School account">
            {SCHOOL_ACCOUNTS.map((account) => {
              const active = username === account.username;
              const color = schoolColor(account.school);
              return (
                <button
                  key={account.username}
                  type="button"
                  className={`auth-school-btn ${active ? 'auth-school-btn-active' : ''}`}
                  style={{ '--school-color': color }}
                  aria-pressed={active}
                  onClick={() => setUsername(account.username)}
                >
                  {account.username}
                </button>
              );
            })}
          </div>

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

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={submitting || !username}
          >
            {submitting ? 'Please wait…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
