import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';

export function PlayerConsentScreen() {
  const navigate = useNavigate();
  const t = useTranslation();
  const settings = useGameStore((state) => state.settings);
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
    <Screen
      title={t('Player registration')}
      showBack
      backTo="/game"
      className="kiosk-consent"
      maxWidth="680px"
    >
      <form className="simple-registration" onSubmit={submit}>
        <div className="consent-inputs-grid">
          <div className="form-group vintage-form-group">
            <label htmlFor="player-name" className="form-label vintage-label">
              <span>{t('Full Name')}</span>
              {settings.requirePlayerName && <small>{t('Required')}</small>}
            </label>
            <input
              id="player-name"
              className="form-input vintage-input"
              placeholder={t('Enter your full name')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required={settings.requirePlayerName}
              maxLength={25}
              autoComplete="name"
            />
          </div>

          <div className="form-group vintage-form-group">
            <label htmlFor="player-email" className="form-label vintage-label">
              <span>{t('Email Address')}</span>
              {settings.requirePlayerEmail && <small>{t('Required')}</small>}
            </label>
            <input
              id="player-email"
              type="email"
              className="form-input vintage-input"
              placeholder={t('Enter your email address')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required={settings.requirePlayerEmail}
              maxLength={254}
              autoComplete="email"
            />
          </div>

          <div className="form-group vintage-form-group">
            <label htmlFor="player-phone" className="form-label vintage-label">
              <span>{t('Contact Number')}</span>
              {settings.requirePlayerPhone && <small>{t('Required')}</small>}
            </label>
            <input
              id="player-phone"
              type="tel"
              className="form-input vintage-input"
              placeholder={t('Enter your contact number')}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required={settings.requirePlayerPhone}
              maxLength={30}
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="simple-consent">
          <label>
            <input
              type="checkbox"
              className="vintage-custom-check"
              required
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <span className="checkbox-text">
              {t('I have read and agree to the Privacy Notice.')}
            </span>
          </label>
          <button type="button" className="privacy-details-link" aria-haspopup="dialog" onClick={() => setShowPrivacy(true)}>{t('View more details')}</button>
        </div>

        {/* Primary Action Button */}
        <button
          type="submit"
          className="btn registration-submit"
          disabled={!agreed}
        >
          <span>{t('Agree & play')}</span>
          <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
        </button>
      </form>
      <Modal title={t('Privacy Notice')} isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} maxWidth="640px">
        <p>{t('Global Visions Holdings Inc. (GVI) collects your name, email address, and contact number for game registration, participant identification, game administration, and game-related communications.')}</p>
        <p>{t('Only authorized personnel may access your registration details. Personal information must be protected and retained only as long as needed for these purposes, in accordance with the Data Privacy Act of 2012 (RA 10173).')}</p>
        <p>{t('Your registration details stay on this device during your session. Your name and score appear on this device\'s leaderboard and remain in its browser storage.')}</p>
        <p>{t('By agreeing, you consent to the processing of your information for these purposes.')}</p>
      </Modal>
    </Screen>
  );
}
