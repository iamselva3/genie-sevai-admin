import clsx from 'clsx';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Wordmark } from '../components/Brand';
import { Button, ErrorBox, TextField } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';

type Tab = 'team' | 'pro';

export default function LoginPage() {
  const { session, loginStaff, loginPro, expired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>('team');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={session.kind === 'pro' ? '/jobs' : '/'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === 'team') {
        await loginStaff(email.trim(), password);
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from && from !== '/login' ? from : '/', { replace: true });
      } else {
        await loginPro(phone.replace(/\D/g, '').slice(-10), password);
        navigate('/jobs', { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setPassword('');
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Wordmark tone="light" sub="Operations" />
        <div className="relative z-10 max-w-md">
          <p className="font-display text-5xl leading-[1.02] font-extrabold tracking-tight">
            Every booking,
            <br />
            every pro,
            <br />
            <span className="bg-yellow px-2 text-ink">one desk.</span>
          </p>
          <p className="mt-6 text-white/70">
            Control what customers can book, assign the right professional to every job, and keep each visit on time.
          </p>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-16 grid grid-cols-3 gap-3 opacity-90">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className={clsx('size-20 rounded-2xl', i % 4 === 0 ? 'bg-yellow' : i % 3 === 0 ? 'bg-white' : 'border-2 border-white/25')}
            />
          ))}
        </div>
        <p className="text-xs text-white/40">Genie Sevai · Home services, handled.</p>
      </section>

      <section className="flex items-center justify-center bg-paper px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Wordmark tone="dark" sub="Operations" />
          </div>
          <h1 className="font-display text-3xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-mute">
            {tab === 'team' ? 'Operations team and admins.' : 'Service professionals: see and run your jobs.'}
          </p>

          <div role="group" aria-label="Account type" className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1">
            {(
              [
                ['team', 'Team'],
                ['pro', 'Professional'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                onClick={() => switchTab(key)}
                className={clsx(
                  'h-9 rounded-lg text-sm font-semibold transition-colors',
                  tab === key ? 'bg-ink text-white' : 'text-ink hover:bg-black/5',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {expired && !error && (
            <p className="mt-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-mute">
              Your session ended. Please sign in again.
            </p>
          )}

          <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
            {tab === 'team' ? (
              <TextField
                key="email"
                label="Email"
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@sevai.in"
              />
            ) : (
              <TextField
                key="phone"
                label="Phone number"
                id="login-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
              />
            )}
            <TextField
              label="Password"
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <ErrorBox message={error} />}
            <Button type="submit" busy={busy} className="mt-1 h-11 w-full">
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
