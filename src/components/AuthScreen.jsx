import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function AuthScreen() {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'sign-up';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    const credentials = { email: email.trim(), password };
    const { data, error: authError } = isSignUp
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials);

    if (authError) {
      setError(authError.message);
    } else if (isSignUp && !data.session) {
      setMessage('Check your email to confirm your account, then sign in.');
    }

    setSubmitting(false);
  };

  const switchMode = () => {
    setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
    setError('');
    setMessage('');
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-heading">
          <span className="app-title-mark">SCH2</span>
          <h1>Conduct &amp; Indent Scheduler</h1>
          <p>{isSignUp ? 'Create an authorized account.' : 'Sign in to access the shared schedule.'}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="text-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="form-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className="text-input"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && <div className="status-message status-error">{error}</div>}
          {message && <div className="status-message status-success">{message}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button className="auth-mode-button" type="button" onClick={switchMode}>
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </section>
    </main>
  );
}
