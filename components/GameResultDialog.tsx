import { ArrowLeft, ArrowRight, RotateCcw, Trophy, UserRoundPlus, Wine } from 'lucide-react';
import { Modal } from './Modal';
import { useTranslation } from '../services/i18n';

interface GameResultDialogProps {
  isOpen: boolean;
  won: boolean;
  score: number;
  onAction: () => void;
  actionLabel?: string;
  onNewPlayer?: () => void;
  onExit?: () => void;
}

export function GameResultDialog({ isOpen, won, score, onAction, actionLabel = 'Play again', onNewPlayer, onExit }: GameResultDialogProps) {
  const t = useTranslation();
  return (
    <Modal title={t(won ? 'Congratulations!' : 'Game Over')} isOpen={isOpen} onClose={onAction} maxWidth="540px" className="game-result-dialog"
      actions={<>
        <button type="button" className="btn result-primary" data-dialog-autofocus onClick={onAction}>{actionLabel === 'Continue' ? <ArrowRight aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}{t(actionLabel)}</button>
        {onNewPlayer && <button type="button" className="btn ghost" onClick={onNewPlayer}><UserRoundPlus aria-hidden="true" />{t('Next player')}</button>}
        {onExit && <button type="button" className="privacy-details-link" onClick={onExit}><ArrowLeft aria-hidden="true" />{t('Game menu')}</button>}
      </>}>
      <div className={`game-result-summary ${won ? 'is-win' : 'is-gameover'}`}>
        {won ? <Trophy aria-hidden="true" /> : <Wine aria-hidden="true" />}
        <span>{t(won ? 'Your score' : 'Final score')}</span>
        <strong>{score}</strong>
      </div>
    </Modal>
  );
}