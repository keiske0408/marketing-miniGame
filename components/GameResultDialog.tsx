import { ArrowLeft, RotateCcw, Trophy, UserRoundPlus, Wine } from 'lucide-react';
import { Modal } from './Modal';
import { useTranslation } from '../services/i18n';
import { useGameStore } from '../store/gameStore';
import congratulations from '../assets/wine_game_UI/SCREEN 2/CONGRATS.png';
import soClose from '../assets/wine_game_UI/SCREEN 2/SO CLOSE.png';
import winner from '../assets/wine_game_UI/SCREEN 2/WINNER.png';

interface GameResultDialogProps {
  isOpen: boolean;
  won: boolean;
  result: string;
  resultLabel: string;
  onAction: () => void;
  onNewPlayer?: () => void;
  onExit?: () => void;
  variant?: 'default' | 'stop-clock';
}

export function GameResultDialog({ isOpen, won, result, resultLabel, onAction, onNewPlayer, onExit, variant = 'default' }: GameResultDialogProps) {
  const t = useTranslation();
  const language = useGameStore((state) => state.settings.language);
  const stopClock = variant === 'stop-clock';
  return (
    <Modal title={t(won ? 'Congratulations!' : stopClock ? 'So close!' : 'Thank you for playing!')} isOpen={isOpen} onClose={onAction} dismissible={false}
      maxWidth={stopClock ? '870px' : '540px'} className={`game-result-dialog${stopClock ? ' event-dialog stop-clock-result' : ''}`}
      overlayClassName={stopClock ? 'event-modal-overlay stop-clock-overlay' : ''}
      headingDecoration={stopClock && (
        <svg className={`stop-clock-result-art${won ? ' is-win' : ''}`} viewBox={won ? '210 145 440 140' : '390 150 100 115'} aria-hidden="true" focusable="false">
          <image href={won ? congratulations : soClose} width="909" height={won ? '802' : '714'} />
        </svg>
      )}
      actions={<>
        {onNewPlayer && <button type="button" className={`btn result-primary${stopClock ? ' event-button' : ''}`} data-dialog-autofocus onClick={onNewPlayer}><UserRoundPlus aria-hidden="true" />{t('Next player')}</button>}
        <button type="button" className="privacy-details-link result-replay" onClick={onAction}><RotateCcw aria-hidden="true" />{t('Play again')}</button>
        {onExit && <button type="button" className="privacy-details-link" onClick={onExit}><ArrowLeft aria-hidden="true" />{t('Game menu')}</button>}
      </>}>
      <div className={`game-result-summary ${won ? 'is-win' : 'is-gameover'}`}>
        {!stopClock && (won ? <Trophy aria-hidden="true" /> : <Wine aria-hidden="true" />)}
        <span>{t(stopClock && won ? 'You hit the winning zone!' : resultLabel)}</span>
        <strong>{result}</strong>
      </div>
      {stopClock && (
        <>
          {won && <div className="stop-clock-winner">
            {language === 'en' && <img src={winner} alt="" />}
            <span className={language === 'en' ? 'event-sr-only' : undefined}>{t("You're a winner!")}</span>
          </div>}
          <p className="stop-clock-result-message">{t(won ? 'Show this screen to claim your prize.' : 'Every second counts. Thanks for taking the challenge!')}</p>
        </>
      )}
    </Modal>
  );
}