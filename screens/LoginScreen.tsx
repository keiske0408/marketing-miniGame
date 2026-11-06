import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '../components/Screen';
import { Tabs } from '../components/Tabs';
import { MenuButton } from '../components/MenuButton';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';

const AuthSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Please enter your name or sommelier alias (at least 2 characters)')
    .max(25, 'Name cannot exceed 25 characters')
    .optional()
    .or(z.literal('')),
  identifier: z
    .string()
    .min(1, 'Please enter your email or mobile number')
    .refine((val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    }, 'Enter a valid email (e.g., alex@vineyard.com) or phone number'),
  consentTerms: z.boolean().refine((val) => val === true, {
    message: 'Please agree to the Event Terms & Privacy Policy to continue',
  }),
  consentMarketing: z.boolean().optional(),
});

type AuthFormData = z.infer<typeof AuthSchema>;

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginWithEmail = useGameStore((state) => state.loginWithEmail);
  const loginAsGuest = useGameStore((state) => state.loginAsGuest);

  const [activeTab, setActiveTab] = useState<'signup' | 'signin' | 'guest'>('signup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const guestExhausted = (location.state as { guestExhausted?: boolean })?.guestExhausted;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(AuthSchema),
    defaultValues: {
      displayName: '',
      identifier: '',
      consentTerms: true,
      consentMarketing: false,
    },
  });

  const onAuthSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    try {
      await loginWithEmail(data.identifier, data.displayName || '', {
        terms: data.consentTerms,
        marketing: Boolean(data.consentMarketing),
      });
      navigate('/menu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestPlay = () => {
    loginAsGuest(watch('displayName') || 'Guest Taster');
    navigate('/play');
  };

  const tabs = [
    { id: 'signup', label: 'Register Pass' },
    { id: 'signin', label: 'Returning Guest' },
    { id: 'guest', label: 'Quick Tasting (Guest)' },
  ];

  return (
    <Screen
      title="Sommelier Pass"
      subtitle="Register to save your vintage scores & claim tasting vouchers"
      showBack={true}
      backTo="/home"
      className="login-screen"
    >
      {guestExhausted && (
        <div className="alert-banner is-warning">
          <strong>🍷 Complimentary demo round complete!</strong> Register your Tasting Pass below for unlimited rounds and to claim your vouchers at the bar.
        </div>
      )}

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'signup' | 'signin' | 'guest')}
        className="auth-tabs"
      />

      {activeTab === 'guest' ? (
        <div className="guest-box">
          <div className="guest-info-card">
            <span className="guest-icon" aria-hidden="true">🍷</span>
            <h3>Instant Guest Tasting</h3>
            <p>
              Enjoy <strong>1 complimentary demo round</strong> right away.
              You can register your pass afterwards to lock in your leaderboard score and claim wine rewards.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="guest-name" className="form-label">
              Taster Nickname (Optional)
            </label>
            <input
              id="guest-name"
              type="text"
              placeholder="e.g. ChateauLover"
              className="form-input"
              {...register('displayName')}
            />
          </div>

          <MenuButton variant="primary" onClick={handleGuestPlay} badge="1 DEMO ROUND">
            ▶ START GUEST TASTING
          </MenuButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onAuthSubmit)} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="auth-name" className="form-label">
              Guest / Sommelier Name <span className="req">*</span>
            </label>
            <input
              id="auth-name"
              type="text"
              placeholder="e.g. Camille Laurent"
              className={`form-input ${errors.displayName ? 'is-invalid' : ''}`}
              {...register('displayName')}
            />
            {errors.displayName && (
              <span className="form-error-msg">{errors.displayName.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="auth-ident" className="form-label">
              Email or Mobile Number <span className="req">*</span>
            </label>
            <input
              id="auth-ident"
              type="text"
              placeholder="camille@domain.com or +1 555-0199"
              className={`form-input ${errors.identifier ? 'is-invalid' : ''}`}
              {...register('identifier')}
            />
            {errors.identifier && (
              <span className="form-error-msg">{errors.identifier.message}</span>
            )}
            <small className="form-hint">
              Instant venue registration — your pass activates immediately so you can play right away.
            </small>
          </div>

          <div className="consent-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                className="custom-checkbox"
                {...register('consentTerms')}
              />
              <span>
                I agree to the{' '}
                <button
                  type="button"
                  className="inline-link"
                  onClick={() => setShowTermsModal(true)}
                >
                  Event Terms &amp; Privacy Policy
                </button>{' '}
                <span className="req">*</span>
              </span>
            </label>
            {errors.consentTerms && (
              <span className="form-error-msg">{errors.consentTerms.message}</span>
            )}

            <label className="checkbox-label">
              <input
                type="checkbox"
                className="custom-checkbox"
                {...register('consentMarketing')}
              />
              <span>
                Send me exclusive vintage releases, cellar club invitations &amp; tasting notes (optional)
              </span>
            </label>
          </div>

          <MenuButton
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            badge="INSTANT"
          >
            {isSubmitting
              ? 'Activating Pass...'
              : activeTab === 'signup'
              ? '🍷 Activate Tasting Pass & Play'
              : '🍷 Access Pass & Continue'}
          </MenuButton>
        </form>
      )}

      <Modal
        title="Wine Event Terms & Privacy"
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      >
        <div className="terms-body">
          <h4>Event Participation</h4>
          <p>
            By registering for the Grand Vintage Challenge, your chosen display name and score may appear on the live tasting lounge leaderboard. Must be of legal drinking age to redeem wine tasting pours at the bar.
          </p>
          <h4>Privacy Policy</h4>
          <p>
            Your email or phone number is stored securely in Supabase to verify your Tasting Pass and issue reward vouchers. You can permanently delete your profile at any time in Settings &gt; Delete My Data.
          </p>
        </div>
      </Modal>
    </Screen>
  );
}
