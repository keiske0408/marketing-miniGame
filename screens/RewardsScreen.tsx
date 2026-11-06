import { Screen } from '../components/Screen';
import { MenuButton } from '../components/MenuButton';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

export function RewardsScreen() {
  const rewards = useGameStore((state) => state.rewards);
  const claimReward = useGameStore((state) => state.claimReward);
  const user = useGameStore((state) => state.user);

  const handleClaim = (id: string) => {
    soundManager.playSuccess();
    haptics.success();
    claimReward(id);
  };

  return (
    <Screen
      title="My Rewards"
      subtitle="Exclusive vouchers unlocked at Nexus Expo 2026"
      showBack={true}
      backTo={user ? '/menu' : '/home'}
      className="rewards-screen"
    >
      <div className="rewards-notice-card">
        <span className="notice-icon">🎪</span>
        <p>
          Present these digital voucher codes to our staff at <strong>Nexus Expo Booth B3</strong> to claim your event perks, stickers, coffee, or merchandise!
        </p>
      </div>

      <div className="rewards-stack">
        {rewards.length === 0 ? (
          <div className="empty-rewards-card">
            <span className="empty-icon">🎟️</span>
            <h3>No Rewards Yet</h3>
            <p>Score 3 or more points in a challenge round to unlock instant event vouchers!</p>
          </div>
        ) : (
          rewards.map((reward) => (
            <div
              key={reward.id}
              className={`reward-item-card ${reward.claimed ? 'is-claimed' : ''}`}
            >
              <div className="reward-card-top">
                <span className="reward-badge-emoji">{reward.badge}</span>
                <div className="reward-text-block">
                  <h3 className="reward-title">{reward.title}</h3>
                  <p className="reward-desc">{reward.description}</p>
                </div>
              </div>

              <div className="reward-code-box">
                <span className="reward-code-label">REDEEM CODE</span>
                <code className="reward-code-value">{reward.code}</code>
              </div>

              <div className="reward-card-bottom">
                {reward.claimed ? (
                  <span className="claimed-stamp">✓ REDEEMED AT BOOTH</span>
                ) : (
                  <MenuButton
                    variant="accent"
                    onClick={() => handleClaim(reward.id)}
                    badge="SHOW TO STAFF"
                  >
                    Mark as Redeemed
                  </MenuButton>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Screen>
  );
}

