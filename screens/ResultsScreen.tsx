import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuButton } from '../components/MenuButton';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';
import { supabaseService } from '../services/supabase';
import type { GameMode } from '../types';

interface ResultsProps {
  score: number;
  level: number;
  accuracies: number[];
  gameMode?: GameMode;
  onPlayAgain: () => void;
}

export function ResultsScreen({
  score,
  level,
  accuracies,
  gameMode = 'picture-match',
  onPlayAgain,
}: ResultsProps) {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);
  const addReward = useGameStore((state) => state.addReward);
  const showToast = useGameStore((state) => state.showToast);

  const [rank, setRank] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [rewardCode, setRewardCode] = useState<string | null>(null);

  const avgAccuracy =
    accuracies.length > 0
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : 0;

  useEffect(() => {
    soundManager.playLevelUp();
    haptics.success();

    const submitScore = async () => {
      try {
        // 1. Direct Supabase submission when client credentials are set
        const directRes = await supabaseService.submitScore({
          userId: user?.id || 'guest',
          displayName: user?.displayName || 'Guest Taster',
          gameMode,
          score,
          level,
          accuracy: avgAccuracy,
        });

        if (directRes.rank) {
          setRank(directRes.rank);
        }

        // 2. Also call Vercel Serverless Function if deployed
        const payload = {
          userId: user?.id || 'guest',
          runId: `run-${Date.now()}`,
          gameMode,
          score,
          level,
          accuracy: avgAccuracy,
          timestamp: Date.now(),
        };

        const res = await fetch('/api/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (!directRes.rank && data.rank) setRank(data.rank);
          if (data.rewardCode) {
            setRewardCode(data.rewardCode);
            addReward({
              id: `rew-${Date.now()}`,
              title: 'Sommelier Reserve Voucher',
              description: `Earned ${score} pts in ${gameMode === 'target-timer' ? 'Perfect Pour Timer' : 'Vintage Picture Match'}! Present at the Sommelier Bar.`,
              badge: '🍾',
              code: data.rewardCode,
              unlockedAt: new Date().toISOString(),
              claimed: false,
            });
          }
        } else if (!directRes.rank) {
          setRank(Math.max(1, Math.floor(10 - score / 4)));
        }
      } catch {
        setRank((prev) => prev ?? Math.max(1, Math.floor(10 - score / 4)));
      } finally {
        if (score >= 3) {
          setRewardCode((prev) => {
            if (prev) return prev;
            const code = `VINO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            addReward({
              id: `rew-${Date.now()}`,
              title: 'Sommelier Reserve Voucher',
              description: `Earned ${score} pts in ${gameMode === 'target-timer' ? 'Perfect Pour Timer' : 'Vintage Picture Match'}! Present at the Sommelier Bar.`,
              badge: '🍾',
              code,
              unlockedAt: new Date().toISOString(),
              claimed: false,
            });
            return code;
          });
        }
        setIsSubmitting(false);
      }
    };

    submitScore();
  }, [score, level, avgAccuracy, gameMode, user, addReward]);

  const handleShare = async () => {
    soundManager.playClick();
    haptics.tick();

    const gameLabel =
      gameMode === 'target-timer' ? 'The Perfect Pour Timer' : 'Vintage Picture Match';
    const text = `🍷 I scored ${score} pts (Vintage ${level}, ${avgAccuracy}% precision) in ${gameLabel} at the Grand Vintage Wine Event!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Grand Vintage Wine Challenge',
          text,
          url: window.location.origin,
        });
        showToast('Shared tasting result!', 'success');
      } catch {
        // User cancelled
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Tasting score copied to clipboard!', 'success');
      } catch {
        showToast('Unable to copy', 'error');
      }
    }
  };

  return (
    <div className="results-wrapper">
      <div className="card results-card">
        <div className="results-header">
          <span className="results-trophy" aria-hidden="true">🍷</span>
          <h2>Tasting Complete!</h2>
          <p className="results-sub">
            {gameMode === 'target-timer'
              ? 'The Perfect Pour Stopwatch Summary'
              : 'Vintage Picture Match Summary'}
          </p>
        </div>

        <div className="results-stats-grid">
          <div className="result-stat-box">
            <span className="result-stat-label">Total Score</span>
            <span className="result-stat-value text-accent">{score}</span>
          </div>

          <div className="result-stat-box">
            <span className="result-stat-label">Vintage Level</span>
            <span className="result-stat-value">{level}</span>
          </div>

          <div className="result-stat-box">
            <span className="result-stat-label">Precision</span>
            <span className="result-stat-value text-highlight">{avgAccuracy}%</span>
          </div>

          <div className="result-stat-box">
            <span className="result-stat-label">Lounge Rank</span>
            <span className="result-stat-value text-sun">
              {isSubmitting ? '...' : rank ? `#${rank}` : 'Top 10%'}
            </span>
          </div>
        </div>

        {rewardCode && (
          <div className="reward-unlocked-banner">
            <div className="reward-badge-icon">🍾</div>
            <div className="reward-details">
              <strong>Sommelier Tasting Voucher Unlocked!</strong>
              <span>
                Present at the Tasting Bar: <code>{rewardCode}</code>
              </span>
            </div>
          </div>
        )}

        {user?.isGuest && (
          <div className="guest-prompt-box">
            <p>
              🍇 <strong>Save this score to the Grand Vintage Leaderboard?</strong>
            </p>
            <p className="guest-prompt-sub">
              Register your complimentary Sommelier Pass now to keep your vouchers and play unlimited rounds.
            </p>
            <MenuButton
              variant="accent"
              onClick={() => navigate('/login')}
              badge="INSTANT"
            >
              Register Pass to Save Score
            </MenuButton>
          </div>
        )}

        <div className="results-actions">
          <MenuButton variant="primary" onClick={onPlayAgain}>
            ↺ Pour Another Round
          </MenuButton>
          <MenuButton variant="secondary" onClick={handleShare}>
            📤 Share Tasting Score
          </MenuButton>
          <MenuButton variant="ghost" onClick={() => navigate('/menu')}>
            🏰 Sommelier Lounge Menu
          </MenuButton>
        </div>
      </div>
    </div>
  );
}
