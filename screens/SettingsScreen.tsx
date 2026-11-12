import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { Slider } from '../components/Slider';
import { Toggle } from '../components/Toggle';
import { MenuButton } from '../components/MenuButton';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import type { Difficulty, Language, ThemeMode } from '../types';

export function SettingsScreen() {
  const t = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from === '/game' ? '/game' : '/home';
  const user = useGameStore((state) => state.user);
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const updateDisplayName = useGameStore((state) => state.updateDisplayName);
  const deleteAccountData = useGameStore((state) => state.deleteAccountData);
  const logout = useGameStore((state) => state.logout);

  const [editName, setEditName] = useState(user?.displayName || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim()) {
      await updateDisplayName(editName);
    }
  };

  const handleDeleteData = async () => {
    setShowDeleteModal(false);
    await deleteAccountData();
    navigate('/home');
  };

  return (
    <Screen
      title={t('Admin Settings')}
      showBack={true}
      backTo={returnTo}
      className="settings-screen"
    >
      <section className="settings-section">
        <div className="settings-card setting-row">
          <label htmlFor="lang-select" className="setting-row-label">{t('Language')}</label>
          <select id="lang-select" className="select-input" value={settings.language === 'tl' ? 'tl' : 'en'} onChange={(event) => updateSettings({ language: event.target.value as Language })}>
            <option value="en">English</option>
            <option value="tl">Tagalog</option>
          </select>
        </div>
      </section>
      {/* Audio Section */}
      <section className="settings-section">
        <h2 className="section-title">{t('Audio')}</h2>
        <div className="settings-card">
          <Slider
            label={t('Master Volume')}
            value={settings.masterVolume}
            disabled={settings.muted}
            onChange={(val) => updateSettings({ masterVolume: val })}
          />
          <Slider
            label={t('Music Volume')}
            value={settings.musicVolume}
            disabled={settings.muted}
            onChange={(val) => updateSettings({ musicVolume: val })}
          />
          <Slider
            label={t('SFX Volume')}
            value={settings.sfxVolume}
            disabled={settings.muted}
            onChange={(val) => updateSettings({ sfxVolume: val })}
          />
          <Toggle
            label={t('Mute audio')}
            checked={settings.muted}
            onChange={(val) => updateSettings({ muted: val })}
          />
        </div>
      </section>

      {/* Accessibility & Game Feel */}
      <section className="settings-section">
        <h2 className="section-title">{t('Gameplay')}</h2>
        <div className="settings-card">
          <Toggle
            label={t('Vibration')}
            checked={settings.haptics}
            onChange={(val) => updateSettings({ haptics: val })}
          />

          <Toggle
            label={t('Reduce motion')}
            checked={settings.reducedMotion}
            onChange={(val) => updateSettings({ reducedMotion: val })}
          />

          <div className="setting-row">
            <label htmlFor="theme-select" className="setting-row-label">
              {t('Theme')}
            </label>
            <select
              id="theme-select"
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as ThemeMode })}
              className="select-input"
            >
              <option value="auto">{t('System')}</option>
              <option value="light">{t('Light')}</option>
              <option value="dark">{t('Dark')}</option>
            </select>
          </div>

          <div className="setting-row">
            <label htmlFor="diff-select" className="setting-row-label">
              {t('Difficulty')}
            </label>
            <select
              id="diff-select"
              value={settings.difficulty}
              onChange={(e) => updateSettings({ difficulty: e.target.value as Difficulty })}
              className="select-input"
            >
              <option value="chill">{t('Easy')}</option>
              <option value="normal">{t('Normal')}</option>
              <option value="hard">{t('Hard')}</option>
            </select>
          </div>

        </div>
      </section>

      {/* Event Host & Booth Controls */}
      <section className="settings-section">
        <h2 className="section-title">{t('Event controls')}</h2>
        <div className="settings-card">
          <div className="setting-row">
            <label htmlFor="timer-target" className="setting-row-label">{t('Time Stop target (seconds)')}</label>
            <input id="timer-target" type="number" min="1" max="300" step="0.1"
              defaultValue={settings.timerTargetMode === 'fixed' ? settings.timerCustomTarget ?? 24 : 24}
              onBlur={(event) => {
                const value = Number(event.currentTarget.value);
                if (Number.isFinite(value) && value >= 1 && value <= 300) {
                  updateSettings({ timerTargetMode: 'fixed', timerCustomTarget: value });
                } else {
                  event.currentTarget.value = String(settings.timerTargetMode === 'fixed' ? settings.timerCustomTarget ?? 24 : 24);
                }
              }} className="form-input" />
          </div>
          <Toggle label={t('Require player name')} checked={Boolean(settings.requirePlayerName)}
            onChange={(value) => updateSettings({ requirePlayerName: value })} />
          <Toggle label={t('Require player email')} checked={Boolean(settings.requirePlayerEmail)}
            onChange={(value) => updateSettings({ requirePlayerEmail: value })} />
          <Toggle label={t('Require player phone number')} checked={Boolean(settings.requirePlayerPhone)}
            onChange={(value) => updateSettings({ requirePlayerPhone: value })} />
        </div>
      </section>

      {/* Account Section */}
      {user && (
        <section className="settings-section">
          <h2 className="section-title">{t('Account')}</h2>
          <div className="settings-card">
            <form onSubmit={handleSaveName} className="name-edit-form">
              <label htmlFor="edit-name" className="setting-row-label">
                {t('Display Name')}
              </label>
              <div className="name-edit-row">
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                />
                <button type="submit" className="btn small-btn">
                  {t('Save')}
                </button>
              </div>
            </form>

            <div className="account-actions-row">
              <button
                type="button"
                className="btn ghost text-danger"
                onClick={() => {
                  logout();
                  navigate('/home');
                }}
              >
                {t('Log Out')}
              </button>

              <button
                type="button"
                className="btn ghost text-danger-subtle"
                onClick={() => setShowDeleteModal(true)}
              >
                {t('Delete My Data')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Legal & Credits Section */}
      <section className="settings-section">
        <h2 className="section-title">{t('Legal & Info')}</h2>
        <div className="settings-card legal-links-grid">
          <button
            type="button"
            className="text-link-btn"
            onClick={() =>
              setModalContent({
                title: 'Terms of Service',
                body: 'By participating in this marketing game event, scores and display names may appear on public display boards during the conference. In-game vouchers are subject to booth stock availability.',
              })
            }
          >
            {t('Terms of Service')}
          </button>

          <button
            type="button"
            className="text-link-btn"
            onClick={() =>
              setModalContent({
                title: 'Privacy Policy',
                body: 'We respect your privacy. Contact details provided for registration are used solely for identity verification and voucher redemption. You may delete your data anytime.',
              })
            }
          >
            {t('Privacy Policy')}
          </button>

          <button
            type="button"
            className="text-link-btn"
            onClick={() =>
              setModalContent({
                title: 'Game Credits',
                body: 'Perfect Picture Match • Built with Vite, React, TypeScript, Web Audio API, and CSS tokens. Procedural SVG illustration scenes created with mathematical vectors.',
              })
            }
          >
            {t('Game Credits')}
          </button>
        </div>
      </section>

      {/* Delete Data Confirmation Modal */}
      <Modal
        title={t('Permanently Delete Data?')}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        actions={
          <>
            <MenuButton variant="ghost" onClick={() => setShowDeleteModal(false)}>
              {t('Cancel')}
            </MenuButton>
            <MenuButton variant="danger" onClick={handleDeleteData}>
              {t('Yes, Delete All My Data')}
            </MenuButton>
          </>
        }
      >
        <p className="modal-warning-text">
          {t('This permanently deletes your profile, scores, rewards, and consent records. This cannot be undone.')}
        </p>
      </Modal>

      {/* Info Modal */}
      {modalContent && (
        <Modal
          title={t(modalContent.title)}
          isOpen={true}
          onClose={() => setModalContent(null)}
        >
          <p>{t(modalContent.body)}</p>
        </Modal>
      )}
    </Screen>
  );
}

