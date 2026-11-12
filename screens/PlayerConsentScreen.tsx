import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Wine, User, Mail, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Screen } from '../components/Screen';
import { useGameStore } from '../store/gameStore';

export function PlayerConsentScreen() {
  const navigate = useNavigate();
  const settings = useGameStore((state) => state.settings);
  const setKioskPlayer = useGameStore((state) => state.setKioskPlayer);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

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
      name: name.trim() || 'Guest Sommelier',
      email: email.trim(),
      phone: phone.trim(),
    });
    navigate('/play', { replace: true });
  };

  return (
    <Screen
      title="Player Registration"
      subtitle="Château Grand Vintage Arcade Pass"
      showBack
      backTo="/game"
      className="kiosk-consent"
      maxWidth="680px"
    >
      <form className="vintage-consent-card" onSubmit={submit}>
        {/* Ornate Card Header with Crest */}
        <div className="consent-crest-header">
          <div className="consent-badge">
            <Wine className="w-4 h-4 text-gold" aria-hidden="true" />
            <span>OFFICIAL SOMMELIER PASS</span>
          </div>
          <h2 className="consent-title">Privacy &amp; Participation Accord</h2>
          <p className="consent-subtitle">
            Please review our event data privacy practices in accordance with RA 10173.
          </p>
        </div>

        {/* Structured Privacy Highlights */}
        <div className="consent-privacy-box">
          <div className="privacy-pill-item">
            <div className="privacy-icon-box">
              <ShieldCheck className="w-5 h-5 text-gold" aria-hidden="true" />
            </div>
            <div className="privacy-text-content">
              <strong>Data Privacy Act of 2012 (RA 10173)</strong>
              <p>
                Global Visions Holdings Inc. (GVI) collects your name, email, and contact number
                strictly for game registration, live leaderboard standings, and event communications.
              </p>
            </div>
          </div>

          <div className="privacy-pill-item">
            <div className="privacy-icon-box">
              <CheckCircle2 className="w-5 h-5 text-gold" aria-hidden="true" />
            </div>
            <div className="privacy-text-content">
              <strong>Authorized Access &amp; Protection</strong>
              <p>
                Your personal details are safeguarded against unauthorized access, stored securely,
                and retained only for the duration required to administer event prizes and certificates.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="consent-inputs-grid">
          <div className="form-group vintage-form-group">
            <label htmlFor="player-name" className="form-label vintage-label">
              <span className="label-with-icon">
                <User className="w-4 h-4 text-gold" aria-hidden="true" />
                <span>Full Name</span>
              </span>
              <small className="field-tag">{settings.requirePlayerName ? 'Required' : 'Optional'}</small>
            </label>
            <input
              id="player-name"
              className="form-input vintage-input"
              placeholder="e.g. Blair Soliven"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required={settings.requirePlayerName}
              maxLength={25}
              autoComplete="name"
            />
          </div>

          <div className="form-group vintage-form-group">
            <label htmlFor="player-email" className="form-label vintage-label">
              <span className="label-with-icon">
                <Mail className="w-4 h-4 text-gold" aria-hidden="true" />
                <span>Email Address</span>
              </span>
              <small className="field-tag">{settings.requirePlayerEmail ? 'Required' : 'Optional'}</small>
            </label>
            <input
              id="player-email"
              type="email"
              className="form-input vintage-input"
              placeholder="sommelier@grandvintage.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required={settings.requirePlayerEmail}
              maxLength={254}
              autoComplete="email"
            />
          </div>

          <div className="form-group vintage-form-group">
            <label htmlFor="player-phone" className="form-label vintage-label">
              <span className="label-with-icon">
                <Phone className="w-4 h-4 text-gold" aria-hidden="true" />
                <span>Contact Number</span>
              </span>
              <small className="field-tag">{settings.requirePlayerPhone ? 'Required' : 'Optional'}</small>
            </label>
            <input
              id="player-phone"
              type="tel"
              className="form-input vintage-input"
              placeholder="+63 900 000 0000"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required={settings.requirePlayerPhone}
              maxLength={30}
              autoComplete="tel"
            />
          </div>
        </div>

        {/* Consent Checkbox */}
        <label className="vintage-checkbox-card">
          <input
            type="checkbox"
            className="vintage-custom-check"
            required
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          <span className="checkbox-text">
            I acknowledge that I have read this notice and voluntarily consent to the processing of
            my information for event participation and tasting leaderboards.
          </span>
        </label>

        {/* Primary Action Button */}
        <button
          type="submit"
          className="vintage-agree-btn"
          disabled={!agreed}
        >
          <span>AGREE &amp; ENTER CHALLENGE</span>
          <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
        </button>
      </form>
    </Screen>
  );
}
