import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EventBrand } from '../components/EventBrand';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import { TIMER_GAME_NAME } from '../config/constants';
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

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !agreed ||
      (settings.requirePlayerName && !name.trim()) ||
      (settings.requirePlayerEmail && !email.trim()) ||
      (settings.requirePlayerPhone && !phone.trim())
    )
      return;
    setKioskPlayer({
      id: crypto.randomUUID(),
      name: name.trim() || 'Guest',
      email: email.trim(),
      phone: phone.trim(),
    });
    navigate('/play', { replace: true });
  };

  return (
    <div className="event-theme event-page">
      <main className="event-scene event-registration">
        <EventBrand registration />
        <h1 className="event-registration-heading">{mode === 'target-timer' ? TIMER_GAME_NAME : 'Vintage Picture Match'}</h1>
        <form className="event-registration-form" onSubmit={submit} aria-label={t('Player registration')}>
          <div className="event-registration-fields">
            <div>
              <label htmlFor="player-name" className="event-sr-only">
                <span>{t('Full Name')}</span>
                {settings.requirePlayerName && <small>{t('Required')}</small>}
              </label>
              <input
                id="player-name"
                className="event-input"
                placeholder={t('Full Name')}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required={settings.requirePlayerName}
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
                placeholder={t('Email Address')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required={settings.requirePlayerEmail}
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
                placeholder={t('Mobile Number')}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required={settings.requirePlayerPhone}
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
            disabled={!agreed}
          >
            {settings.language === 'en' && <img src={letsPlay} alt="" />}
            <span className={settings.language === 'en' ? 'event-sr-only' : undefined}>{t("Let's play")}</span>
          </button>
        </form>
      </main>
      <nav className="event-support-nav" aria-label={t('Game navigation')}>
        <button type="button" className="event-link-button" onClick={() => navigate('/game')}><ArrowLeft aria-hidden="true" />{t('Back')}</button>
      </nav>
      <Modal title={t('Privacy Notice')} isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} maxWidth="640px" className="event-dialog event-privacy-dialog" overlayClassName="event-modal-overlay">
        <p>{t('Global Visions Holdings Inc. (GVI) collects your name, email address, and contact number for game registration, participant identification, game administration, and game-related communications.')}</p>
        <p>{t('Only authorized personnel may access your registration details. Personal information must be protected and retained only as long as needed for these purposes, in accordance with the Data Privacy Act of 2012 (RA 10173).')}</p>
        <p>{t('Your registration details stay on this device during your session. Your name and score appear on this device\'s leaderboard and remain in its browser storage.')}</p>
        <p>{t('By agreeing, you consent to the processing of your information for these purposes.')}</p>
      </Modal>
    </div>
  );
}
