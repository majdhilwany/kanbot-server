import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthProvider';
import { ApiError, fieldErrors } from '../../api/client';
import { usePrefs } from '../../lib/prefs';
import { Sparkles } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string().min(1, 'Please confirm your password'),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function Field({ label, error, ...p }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { t } = usePrefs();
  return (
    <label className="field">
      <span>{t(label)}</span>
      <input {...p} aria-invalid={!!error} />
      {error && <small className="err" role="alert">{t(error)}</small>}
    </label>
  );
}

function AuthCard({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  const { t } = usePrefs();
  return (
    <main className="auth auth-premium">
      <div className="card auth-card">
        <div className="brand auth-brand"><span className="auth-brand-mark"><img src="/kanbot-icon.svg" alt="" width={30} height={30} /><i /></span><span>Kanbot</span></div>
        <h1>{t(title)}</h1>
        {children}
        <p className="muted">{footer}</p>
      </div>
    </main>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const { t } = usePrefs();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try { await login(v); } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Something went wrong.'); }
  });

  return (
    <AuthCard title="Log in" footer={<>{t('No account?')} <Link to={`/register${params.get('redirect') ? `?redirect=${encodeURIComponent(params.get('redirect')!)}` : ''}`}>{t('Register')}</Link></>}>
      {params.get('expired') && <div className="banner" role="alert">{t('Your session has expired. Please log in again.')}</div>}
      {formError && <div className="banner error" role="alert">{t(formError)}</div>}
      <form onSubmit={onSubmit} noValidate>
        <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <button className="btn primary" disabled={isSubmitting}>{t(isSubmitting ? 'Logging in…' : 'Log in')}</button>
      </form>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const { t } = usePrefs();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setFormError(null);
    try {
      await signUp({ name, email, password });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { setError('email', { message: 'An account with this email already exists' }); return; }
      const fe = fieldErrors(e);
      const keys = Object.keys(fe).filter((k): k is 'name' | 'email' | 'password' => ['name', 'email', 'password'].includes(k));
      if (keys.length) keys.forEach((k) => setError(k, { message: fe[k] }));
      else setFormError(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  });

  return (
    <AuthCard title="Create your account" footer={<>{t('Already registered?')} <Link to="/login">{t('Log in')}</Link></>}>
      {formError && <div className="banner error" role="alert">{t(formError)}</div>}
      <form onSubmit={onSubmit} noValidate>
        <Field label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Field label="Password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        <Field label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        <button className="btn primary" disabled={isSubmitting}>{t(isSubmitting ? 'Creating…' : 'Create account')}</button>
      </form>
    </AuthCard>
  );
}
