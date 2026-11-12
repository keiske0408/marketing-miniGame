import { ArrowLeft, RotateCcw, Trophy, UserRoundPlus, Wine } from 'lucide-react';
import { Modal } from './Modal';
import { useTranslation } from '../services/i18n';

interface GameResultDialogProps {
  isOpen: boolean;
  won: boolean;
  result: string;
  resultLabel: string;
  onAction: () => void;
  onNewPlayer?: () => void;
  onExit?: () => void;
}

export function GameResultDialog({ isOpen, won, result, resultLabel, onAction, onNewPlayer, onExit }: GameResultDialogProps) {
  const t = useTranslation();
  return (
    <Modal title={t(won ? 'Congratulations!' : 'Thank you for playing!')} isOpen={isOpen} onClose={onAction} dismissible={false} maxWidth="540px" className="game-result-dialog"
      actions={<>
        {onNewPlayer && <button type="button" className="btn result-primary" data-dialog-autofocus onClick={onNewPlayer}><UserRoundPlus aria-hidden="true" />{t('Next player')}</button>}
        <button type="button" className="privacy-details-link result-replay" onClick={onAction}><RotateCcw aria-hidden="true" />{t('Play again')}</button>
        {onExit && <button type="button" className="privacy-details-link" onClick={onExit}><ArrowLeft aria-hidden="true" />{t('Game menu')}</button>}
      </>}>
      <div className={`game-result-summary ${won ? 'is-win' : 'is-gameover'}`}>
        {won ? <Trophy aria-hidden="true" /> : <Wine aria-hidden="true" />}
        <span>{t(resultLabel)}</span>
        <strong>{result}</strong>
      </div>
    </Modal>
  );
}