import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { Slider } from '../components/Slider';
import { Toggle } from '../components/Toggle';
import { MenuButton } from '../components/MenuButton';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from '../services/i18n';
import { soundManager } from '../services/audio';
import type { Difficulty, PictureMatchMode, ThemeMode } from '../types';
import { displayedSeconds, timerRules, validTimerRules } from '../services/eventRules';
import { DESIGN_COLORS, TIMER_GAME_NAME } from '../config/constants';
import ribbonBackground from '../assets/wine_game_UI/SCREEN 2/7.png';
import circlesBackground from '../assets/wine_game_UI/SCREEN 2/5.png';

const DESIGN_PRESETS = [
  ['violet', 'Violet Velocity'],
  ['mischka', 'Mischka Pink'],
  ['slate', 'Solid Slate'],
] as const;

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
  const rules = timerRules(settings);
  const [timerDraft, setTimerDraft] = useState({
    target: rules.target.toFixed(2), winMin: rules.winMin.toFixed(2), winMax: rules.winMax.toFixed(2),
  });
  const [timerError, setTimerError] = useState(false);
  const designColor = settings.designColor ?? 'violet';
  const customColor = settings.customDesignColor ?? DESIGN_COLORS.violet;
  const eventBackground = settings.eventBackground ?? 'ribbon';

  const [editName, setEditName] = useState(user?.displayName || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

  const saveTimerRules = (event: React.FormEvent) => {
    event.preventDefault();
    const next = {
      target: Number(timerDraft.target), winMin: Number(timerDraft.winMin), winMax: Number(timerDraft.winMax),
    };
    if (Object.values(timerDraft).some((value) => !value.trim()) || !validTimerRules(next)) {
      setTimerError(true);
      return;
    }
    const normalized = {
      target: displayedSeconds(next.target), winMin: displayedSeconds(next.winMin), winMax: displayedSeconds(next.winMax),
    };
    updateSettings({
      timerTargetMode: 'fixed', timerCustomTarget: normalized.target,
      timerWinMin: normalized.winMin, timerWinMax: normalized.winMax,
    });
    setTimerDraft({
      target: normalized.target.toFixed(2), winMin: normalized.winMin.toFixed(2), winMax: normalized.winMax.toFixed(2),
    });
    setTimerError(false);
    useGameStore.getState().showToast(t('Event controls saved.'), 'success');
  };

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
        <h2 className="section-title">{t('Event controls')}</h2>
        <div className="settings-card">
          <form className="event-timer-form" onSubmit={saveTimerRules} noValidate>
            <h3>{TIMER_GAME_NAME}</h3>
            {([
              ['target', `${TIMER_GAME_NAME} target (seconds)`],
              ['winMin', 'Winning minimum (seconds)'],
              ['winMax', 'Winning maximum (seconds)'],
            ] as const).map(([field, label]) => (
              <div className="setting-row" key={field}>
                <label htmlFor={`timer-${field}`} className="setting-row-label">{t(label)}</label>
                <input id={`timer-${field}`} type="number" inputMode="decimal" min={field === 'target' ? 1 : 0} max="300" step="0.01"
                  value={timerDraft[field]} onChange={(event) => setTimerDraft({ ...timerDraft, [field]: event.target.value })}
                  aria-invalid={timerError} aria-describedby={timerError ? 'timer-settings-error' : 'timer-range-indicator'}
                  className="form-input" />
              </div>
            ))}
            <p id="timer-range-indicator" className="settings-hint" aria-live="polite">
              {t('Saved winning range (inclusive)')}: <strong>{rules.winMin.toFixed(2)}s – {rules.winMax.toFixed(2)}s</strong>
            </p>
            {timerError && <p id="timer-settings-error" className="text-danger" role="alert">{t('Enter a target from 1 to 300 seconds and an ordered winning range from 0 to 300 seconds.')}</p>}
            <button type="submit" className="btn small-btn">{t(`Save ${TIMER_GAME_NAME} rules`)}</button>
          </form>
          <div className="picture-speed-setting">
            <div className="setting-row">
              <label htmlFor="picture-match-mode" className="setting-row-label">{t('Picture Match mode')}</label>
              <select id="picture-match-mode" className="select-input"
                value={settings.pictureMatchMode ?? 'multi'}
                onChange={(event) => {
                  soundManager.playClick();
                  updateSettings({ pictureMatchMode: event.target.value as PictureMatchMode });
                }}>
                <option value="multi">{t('Multi-match (continue until you miss)')}</option>
                <option value="single">{t('One match (end after one success)')}</option>
              </select>
            </div>
            <p className="settings-hint">{t('Multi-match lets players keep matching until they miss. One match ends after the first successful match.')}</p>
            <Slider label={t('Picture Match speed')} value={settings.pictureSpeed ?? 1}
              min={0.25} max={2} step={0.05} unit="×" onChange={(pictureSpeed) => updateSettings({ pictureSpeed })} />
            <p className="settings-hint">{t('Lower is slower. Applies alongside difficulty.')}</p>
          </div>
          <Toggle label={t('Require player name')} checked={Boolean(settings.requirePlayerName)}
            onChange={(value) => updateSettings({ requirePlayerName: value })} />
          <Toggle label={t('Require player email')} checked={Boolean(settings.requirePlayerEmail)}
            onChange={(value) => updateSettings({ requirePlayerEmail: value })} />
          <Toggle label={t('Require player phone number')} checked={Boolean(settings.requirePlayerPhone)}
            onChange={(value) => updateSettings({ requirePlayerPhone: value })} />
          <Toggle label={t('Show leaderboard')} checked={settings.showLeaderboard !== false}
            onChange={(showLeaderboard) => updateSettings({ showLeaderboard })} />
          <p className="settings-hint">{t('When off, standings are hidden in both games, the menu, and the leaderboard page.')}</p>
          <Toggle label={t('Show guidelines')} checked={settings.showGuidelines !== false}
            onChange={(showGuidelines) => updateSettings({ showGuidelines })} />
          <p className="settings-hint">{t('When off, the target pill and gold target line are hidden in the Stop the Clock Challenge.')}</p>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">{t('Design')}</h2>
        <div className="settings-card">
          <h3 className="design-group-title" id="design-color-heading">{t('Design color')}</h3>
          <div className="language-options design-options" role="group" aria-labelledby="design-color-heading">
            {DESIGN_PRESETS.map(([value, name]) => (
              <button key={value} type="button" aria-pressed={designColor === value} onClick={() => updateSettings({ designColor: value })}>
                <i className="design-swatch" style={{ background: DESIGN_COLORS[value] }} aria-hidden="true" />
                <strong>{name}</strong>
                <span>{DESIGN_COLORS[value]}</span>
                {designColor === value && <small>{t('Selected')}</small>}
              </button>
            ))}
            <button type="button" aria-pressed={designColor === 'custom'} onClick={() => updateSettings({ designColor: 'custom' })}>
              <i className="design-swatch" style={{ background: customColor }} aria-hidden="true" />
              <strong>{t('Custom color')}</strong>
              <span>{customColor}</span>
              {designColor === 'custom' && <small>{t('Selected')}</small>}
            </button>
          </div>
          <div className="setting-row">
            <label htmlFor="custom-design-color" className="setting-row-label">{t('Pick a custom color')}</label>
            <input id="custom-design-color" type="color" className="design-color-input" value={customColor}
              onChange={(event) => updateSettings({ designColor: 'custom', customDesignColor: event.target.value })} />
          </div>
          <p className="settings-hint">{t('Light colors tint the artwork instead of filling it, so white text stays readable.')}</p>
          <h3 className="design-group-title" id="design-background-heading">{t('Background')}</h3>
          <div className="language-options design-options" role="group" aria-labelledby="design-background-heading">
            {([['ribbon', ribbonBackground, 'Violet ribbons'], ['circles', circlesBackground, 'Violet circles']] as const).map(([value, image, name]) => (
              <button key={value} type="button" aria-pressed={eventBackground === value} onClick={() => updateSettings({ eventBackground: value })}>
                <img className="design-background-thumb" src={image} alt="" />
                <strong>{t(name)}</strong>
                {eventBackground === value && <small>{t('Selected')}</small>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title" id="language-heading">{t('Language')}</h2>
        <div className="settings-card">
          <p className="settings-hint">{t('Choose the language shown throughout the game.')}</p>
          <div className="language-options" role="group" aria-labelledby="language-heading">
            {(['en', 'tl'] as const).map((language) => (
              <button key={language} type="button" lang={language} aria-pressed={settings.language === language}
                onClick={() => updateSettings({ language })}>
                <strong>{language === 'en' ? 'English' : 'Tagalog'}</strong>
                <span>{language === 'en' ? 'Play in English' : 'Maglaro sa Tagalog'}</span>
                {settings.language === language && <small>{t('Selected')}</small>}
              </button>
            ))}
          </div>
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
      <section className="settings-section">
        <h2 className="section-title">{t('Audio')}</h2>
        <div className="settings-card">
          <p className="settings-hint">{t('Background track')}: Gvi Avp 2026 (Final) 2.mp3 · {t('Looping')}</p>
          <Slider label={t('Master Volume')} value={settings.masterVolume} disabled={settings.muted}
            onChange={(masterVolume) => updateSettings({ masterVolume })} />
          <Slider label={t('Music Volume')} value={settings.musicVolume} disabled={settings.muted}
            onChange={(musicVolume) => updateSettings({ musicVolume })} />
          <Slider label={t('SFX Volume')} value={settings.sfxVolume} disabled={settings.muted}
            onChange={(sfxVolume) => updateSettings({ sfxVolume })} />
          <Toggle label={t('Mute audio')} checked={settings.muted} onChange={(muted) => updateSettings({ muted })} />
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
