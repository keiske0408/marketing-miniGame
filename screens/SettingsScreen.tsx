import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { Slider } from '../components/Slider';
import { Toggle } from '../components/Toggle';
import { MenuButton } from '../components/MenuButton';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/gameStore';
import type { Difficulty, ThemeMode } from '../types';

export function SettingsScreen() {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const updateDisplayName = useGameStore((state) => state.updateDisplayName);
  const deleteAccountData = useGameStore((state) => state.deleteAccountData);
  const loginAsAdmin = useGameStore((state) => state.loginAsAdmin);
  const logout = useGameStore((state) => state.logout);

  const [editName, setEditName] = useState(user?.displayName || '');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminError, setAdminError] = useState('');
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

  // RESTRICT ACCESS TO ADMIN USERS ONLY: If a non-admin player visits /settings, redirect them to the menu
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/menu', { replace: true });
    }
  }, [user, navigate]);

  // If not logged in as admin, show admin login gate or redirect
  if (!user?.isAdmin) {
    return (
      <Screen
        title="Admin Settings"
        subtitle="Event Kiosk & Booth Controls"
        showBack={true}
        backTo={user ? '/menu' : '/home'}
        className="settings-screen"
      >
        <div className="card admin-lock-card">
          <div className="admin-lock-crest">
            <span className="admin-lock-icon" aria-hidden="true">🔒</span>
            <h2 className="admin-lock-title">CHÂTEAU ADMIN ONLY</h2>
            <p className="admin-lock-sub">
              Access to game settings, difficulty presets, sound balancing, and booth target controls is strictly restricted to event administrators.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const clean = adminEmailInput.trim().toLowerCase();
              if (clean === 'admin@chateauvintage.com' || clean.startsWith('admin@')) {
                await loginAsAdmin();
                setAdminError('');
              } else {
                setAdminError('Invalid admin email. Use: admin@chateauvintage.com');
              }
            }}
            className="admin-login-form"
          >
            <label htmlFor="admin-email" className="setting-row-label">
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              placeholder="admin@chateauvintage.com"
              value={adminEmailInput}
              onChange={(e) => {
                setAdminEmailInput(e.target.value);
                setAdminError('');
              }}
              className="form-input admin-input"
            />

            {adminError && <div className="admin-error-text">{adminError}</div>}

            <div className="admin-btn-stack">
              <button type="submit" className="btn btn-primary admin-submit-btn">
                🔓 Unlock Admin Controls
              </button>

              <button
                type="button"
                className="btn ghost admin-quick-btn"
                onClick={async () => {
                  await loginAsAdmin();
                }}
              >
                👑 1-Click Demo Admin Login
              </button>

              <button
                type="button"
                className="btn ghost text-muted"
                onClick={() => navigate(user ? '/menu' : '/home')}
              >
                ‹ Return to Lounge
              </button>
            </div>
          </form>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      title="Admin Settings"
      subtitle="Château Event & Booth Controls • Administrator Mode"
      showBack={true}
      backTo={user ? '/menu' : '/home'}
      className="settings-screen"
    >
      <div className="admin-privilege-banner">
        <span className="admin-crown-icon" aria-hidden="true">👑</span>
        <div className="admin-banner-text">
          <strong>CHÂTEAU ADMINISTRATOR PRIVILEGES ACTIVE</strong>
          <span>Logged in as {user.email || 'admin@chateauvintage.com'} • Full event kiosk control unlocked</span>
        </div>
      </div>
      {/* Audio Section */}
      <section className="settings-section">
        <h2 className="section-title">🔊 Audio Controls</h2>
        <div className="settings-card">
          <Slider
            label="Master Volume"
            value={settings.masterVolume}
            disabled={settings.muted}
            onChange={(val) => updateSettings({ masterVolume: val })}
          />
          <Slider
            label="Music Volume"
            value={settings.musicVolume}
            disabled={settings.muted}
            onChange={(val) => updateSettings({ musicVolume: val })}
          />
          <Slider
            label="SFX Volume"
            value={settings.sfxVolume}
            disabled={settings.muted}
            onChange={(val) => updateSettings({ sfxVolume: val })}
          />
          <Toggle
            label="Mute All Audio"
            description="Silences background chords and puzzle sound effects"
            checked={settings.muted}
            onChange={(val) => updateSettings({ muted: val })}
          />
        </div>
      </section>

      {/* Accessibility & Game Feel */}
      <section className="settings-section">
        <h2 className="section-title">🎮 Gameplay & Accessibility</h2>
        <div className="settings-card">
          <Toggle
            label="Haptic Vibrations"
            description="Phone vibrations on button clicks, locks, and countdown"
            checked={settings.haptics}
            onChange={(val) => updateSettings({ haptics: val })}
          />

          <Toggle
            label="Reduce Animations / Motion"
            description="Replaces camera slides & confetti bursts with gentle fades"
            checked={settings.reducedMotion}
            onChange={(val) => updateSettings({ reducedMotion: val })}
          />

          <div className="setting-row">
            <label htmlFor="theme-select" className="setting-row-label">
              Visual Theme
            </label>
            <select
              id="theme-select"
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as ThemeMode })}
              className="select-input"
            >
              <option value="auto">System Default (Auto)</option>
              <option value="light">Light Arcade</option>
              <option value="dark">Dark Neon</option>
            </select>
          </div>

          <div className="setting-row">
            <label htmlFor="diff-select" className="setting-row-label">
              Difficulty Preset
            </label>
            <select
              id="diff-select"
              value={settings.difficulty}
              onChange={(e) => updateSettings({ difficulty: e.target.value as Difficulty })}
              className="select-input"
            >
              <option value="chill">Chill (Slower speed, generous gap, +8s time)</option>
              <option value="normal">Normal (Standard arcade tuning)</option>
              <option value="hard">Hard (Faster slide, tight tolerance, -5s time)</option>
            </select>
          </div>

          {/* <div className="setting-row">
            <label htmlFor="lang-select" className="setting-row-label">
              Language
            </label>
            <select
              id="lang-select"
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value as Language })}
              className="select-input"
            >
              <option value="en">English (US)</option>
              <option value="es">Español (Ready)</option>
              <option value="fr">Français (Ready)</option>
              <option value="de">Deutsch (Ready)</option>
            </select>
          </div> */}
        </div>
      </section>

      {/* Event Host & Booth Controls */}
      <section className="settings-section">
        <h2 className="section-title">🍷 Event Host &amp; Booth Controls</h2>
        <div className="settings-card">
          <div className="setting-row">
            <label htmlFor="timer-mode-select" className="setting-row-label">
              Perfect Pour Target Mode
            </label>
            <select
              id="timer-mode-select"
              value={settings.timerTargetMode || 'dynamic'}
              onChange={(e) =>
                updateSettings({
                  timerTargetMode: e.target.value as 'dynamic' | 'fixed',
                })
              }
              className="select-input"
            >
              <option value="dynamic">🎲 Dynamic (Randomized targets for each round)</option>
              <option value="fixed">🎯 Fixed Target (Set specific seconds for booth challenge)</option>
            </select>
          </div>

          {settings.timerTargetMode === 'fixed' && (
            <div className="setting-row">
              <label htmlFor="timer-target-select" className="setting-row-label">
                Fixed Target Second
              </label>
              <select
                id="timer-target-select"
                value={settings.timerCustomTarget || 5.0}
                onChange={(e) =>
                  updateSettings({
                    timerCustomTarget: parseFloat(e.target.value),
                  })
                }
                className="select-input"
              >
                <option value="3.0">3.00 Seconds (Fast Paced / High Throughput)</option>
                <option value="4.0">4.00 Seconds (Quick Pour)</option>
                <option value="5.0">5.00 Seconds (Classic Event Standard)</option>
                <option value="6.0">6.00 Seconds (Deliberate Pour)</option>
                <option value="7.0">7.00 Seconds (Sommelier Master Challenge)</option>
                <option value="10.0">10.00 Seconds (Grand Vintage Endurance)</option>
              </select>
            </div>
          )}

          <p className="setting-hint" style={{ fontSize: '0.82rem', color: '#ccb2bc', marginTop: '8px' }}>
            Configure the booth challenge at the event kiosk. Setting a Fixed Target ensures all attendees attempt the exact same second for event prizes and leaderboards.
          </p>
        </div>
      </section>

      {/* Account Section */}
      {user && (
        <section className="settings-section">
          <h2 className="section-title">👤 Account & Profile</h2>
          <div className="settings-card">
            <form onSubmit={handleSaveName} className="name-edit-form">
              <label htmlFor="edit-name" className="setting-row-label">
                Display Name
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
                  Save
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
                Log Out
              </button>

              <button
                type="button"
                className="btn ghost text-danger-subtle"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete My Data
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Legal & Credits Section */}
      <section className="settings-section">
        <h2 className="section-title">ℹ Legal & Info</h2>
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
            Terms of Service
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
            Privacy Policy
          </button>

          <button
            type="button"
            className="text-link-btn"
            onClick={() =>
              setModalContent({
                title: 'Credits & Attributions',
                body: 'Perfect Picture Match • Built with Vite, React, TypeScript, Web Audio API, and CSS tokens. Procedural SVG illustration scenes created with mathematical vectors.',
              })
            }
          >
            Game Credits
          </button>
        </div>
      </section>

      {/* Delete Data Confirmation Modal */}
      <Modal
        title="Permanently Delete Data?"
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        actions={
          <>
            <MenuButton variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </MenuButton>
            <MenuButton variant="danger" onClick={handleDeleteData}>
              Yes, Delete All My Data
            </MenuButton>
          </>
        }
      >
        <p className="modal-warning-text">
          Are you sure? This will permanently erase your player profile, best scores, earned reward vouchers, and consents from both local storage and the database. This action cannot be undone.
        </p>
      </Modal>

      {/* Info Modal */}
      {modalContent && (
        <Modal
          title={modalContent.title}
          isOpen={true}
          onClose={() => setModalContent(null)}
        >
          <p>{modalContent.body}</p>
        </Modal>
      )}
    </Screen>
  );
}

