import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '../components/Screen';
import { MenuButton } from '../components/MenuButton';
import { adminAuth, useAuthStore } from '../store/authStore';
import { loginDestination } from '../services/adminAuth';
import { isSupabaseConfigured } from '../services/supabase';
import { useTranslation } from '../services/i18n';

const LoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export function LoginScreen() {
  const t = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthStore((state) => state.auth);
  const [pending, setPending] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });
  const from: unknown = location.state && typeof location.state === 'object' && 'from' in location.state
    ? location.state.from : undefined;
  const destination = loginDestination(from);

  if (auth.status === 'authenticated') return <Navigate to={destination} replace />;

  const signIn = handleSubmit(async ({ email, password }) => {
    setPending(true);
    try {
      if (await adminAuth.signIn(email, password)) navigate(destination, { replace: true });
    } finally {
      setPending(false);
    }
  });

  return (
    <Screen title={t('Admin login')} subtitle={t('Sign in to unlock this event device.')} className="login-screen">
      {auth.status === 'checking' && !pending && <p role="status">{t('Checking admin session...')}</p>}
      {auth.status === 'error' && <p className="form-error-msg" role="alert">{t(auth.error)}</p>}
      <form onSubmit={signIn} className="auth-form" noValidate aria-busy={pending}>
        <div className="form-group">
          <label htmlFor="admin-email" className="form-label">{t('Email Address')}</label>
          <input id="admin-email" type="email" autoComplete="username" className="form-input"
            {...register('email')} aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'admin-email-error' : undefined} disabled={pending} />
          {errors.email?.message && <span id="admin-email-error" className="form-error-msg" role="alert">{t(errors.email.message)}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="admin-password" className="form-label">{t('Password')}</label>
          <input id="admin-password" type="password" autoComplete="current-password" className="form-input"
            {...register('password')} aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'admin-password-error' : undefined} disabled={pending} />
          {errors.password?.message && <span id="admin-password-error" className="form-error-msg" role="alert">{t(errors.password.message)}</span>}
        </div>
        <MenuButton type="submit" variant="primary" disabled={pending || auth.status === 'checking' || !isSupabaseConfigured}>
          {t(pending ? 'Signing in...' : 'Sign in')}
        </MenuButton>
      </form>
      {auth.status === 'error' && isSupabaseConfigured && (
        <div className="results-actions">
          <MenuButton variant="ghost" onClick={() => void adminAuth.retry()}>{t('Retry session check')}</MenuButton>
          <MenuButton variant="ghost" onClick={() => void adminAuth.signOut()}>{t('Sign out this device')}</MenuButton>
        </div>
      )}
      <p className="form-hint">{t('Only an authorized administrator can unlock the app. Players do not need an account.')}</p>
    </Screen>
  );
}
