import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EventBrand } from '../components/EventBrand';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import { TIMER_GAME_NAME } from '../config/constants';
import { supabase } from '../services/supabase';
import { savePlayerRegistration, type PlayerRegistration } from '../services/playerRegistration';
import letsPlay from '../assets/wine_game_UI/SCREEN 1/LETS PLAY.png';

export function PlayerConsentScreen() {
  const navigate = useNavigate();
  const t = useTranslation();
  const settings = useGameStore((state) => state.settings);
  const mode = useGameStore((state) => state.selectedGameMode);
  const setKioskPlayer = useGameStore((state) => state.setKioskPlayer);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);
  const attempt = useRef<PlayerRegistration | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      pending.current ||
      !agreed ||
      (settings.requirePlayerName && !name.trim()) ||
      (settings.requirePlayerEmail && !email.trim()) ||
      (settings.requirePlayerPhone && !phone.trim())
    )
      return;
    const operator = useGameStore.getState().user;
    if (!operator) {
      setSaveError(true);
      return;
    }
    const details = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
    if (!attempt.current || attempt.current.name !== details.name
      || attempt.current.email !== details.email || attempt.current.phone !== details.phone) {
      attempt.current = { id: crypto.randomUUID(), ...details };
    }
    const player = attempt.current;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await savePlayerRegistration(supabase, player);
      if (!mounted.current || useGameStore.getState().user?.id !== operator.id) return;
      setKioskPlayer({ ...player, name: player.name || 'Guest' });
      navigate('/play', { replace: true });
    } catch {
      if (mounted.current) setSaveError(true);
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <div className="event-theme event-page">
      <main className="event-scene event-registration">
        <EventBrand registration />
        <h1 className="event-registration-heading">{mode === 'target-timer' ? TIMER_GAME_NAME : 'Vintage Picture Match'}</h1>
        {mode === 'target-timer' && <p className="event-registration-intro">{t('Welcome to The Perfect 23!')}</p>}
        <form className="event-registration-form" onSubmit={submit} aria-label={t('Player registration')} aria-busy={saving}>
          <div className="event-registration-fields">
            <div>
              <label htmlFor="player-name" className="event-sr-only">
                <span>{t('Full Name')}</span>
                {settings.requirePlayerName && <small>{t('Required')}</small>}
              </label>
              <input
                id="player-name"
                className="event-input"
                placeholder={settings.requirePlayerName ? `${t('Full Name')} (${t('Required')})` : t('Full Name')}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required={settings.requirePlayerName}
                disabled={saving}
                maxLength={25}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="player-email" className="event-sr-only">
                <span>{t('Email Address')}</span>
                {settings.requirePlayerEmail && <small>{t('Required')}</small>}
              </label>
              <input
                id="player-email"
                type="email"
                className="event-input"
                placeholder={settings.requirePlayerEmail ? `${t('Email Address')} (${t('Required')})` : t('Email Address')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required={settings.requirePlayerEmail}
                disabled={saving}
                maxLength={254}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="player-phone" className="event-sr-only">
                <span>{t('Mobile Number')}</span>
                {settings.requirePlayerPhone && <small>{t('Required')}</small>}
              </label>
              <input
                id="player-phone"
                type="tel"
                className="event-input"
                placeholder={settings.requirePlayerPhone ? `${t('Mobile Number')} (${t('Required')})` : t('Mobile Number')}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required={settings.requirePlayerPhone}
                disabled={saving}
                maxLength={30}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="event-consent">
            <label>
              <input
                type="checkbox"
                required
                checked={agreed}
                disabled={saving}
                onChange={(event) => setAgreed(event.target.checked)}
              />
              <span>
                {t('I acknowledge the Data Privacy Notice')}
              </span>
            </label>
            <button type="button" className="event-privacy-link" aria-haspopup="dialog" onClick={() => setShowPrivacy(true)}>{t('View more details')}</button>
          </div>

          <button
            type="submit"
            className="event-button event-art-button event-registration-submit"
            disabled={!agreed || saving}
          >
            {saving ? t('Saving registration...') : mode === 'target-timer' ? t("LET'S FILL YOUR CUP!") : (
              <>
                {settings.language === 'en' && <img src={letsPlay} alt="" />}
                <span className={settings.language === 'en' ? 'event-sr-only' : undefined}>{t("Let's play")}</span>
              </>
            )}
          </button>
          {saveError && <p className="form-error-msg" role="alert">{t('Unable to save registration. Please check the connection and try again.')}</p>}
        </form>
      </main>
      <nav className="event-support-nav" aria-label={t('Game navigation')}>
        <button type="button" className="event-link-button" onClick={() => navigate('/game')}><ArrowLeft aria-hidden="true" />{t('Back')}</button>
      </nav>
      <Modal title={t('Privacy Notice')} isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} maxWidth="640px" className="event-dialog event-privacy-dialog" overlayClassName="event-modal-overlay">
        <p>{t('Global Visions Holdings Inc. (GVI) collects your name, email address, and contact number for game registration, participant identification, game administration, and game-related communications.')}</p>
        <p>{t('Only authorized personnel may access your registration details. Personal information must be protected and retained only as long as needed for these purposes, in accordance with the Data Privacy Act of 2012 (RA 10173).')}</p>
        <p>{t('Your registration details and privacy acknowledgement are stored in Supabase. Your name and score appear on this device’s leaderboard and remain in its browser storage.')}</p>
        <p>{t('By agreeing, you consent to the processing of your information for these purposes.')}</p>
      </Modal>
    </div>
  );
}
