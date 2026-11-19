import { ArrowLeft, RotateCcw, Trophy, UserRoundPlus, Wine } from 'lucide-react';
import { Modal } from './Modal';
import { useTranslation } from '../services/i18n';
import { useGameStore } from '../store/gameStore';
import congratulations from '../assets/wine_game_UI/SCREEN 2/CONGRATS.png';
import soClose from '../assets/wine_game_UI/SCREEN 2/SO CLOSE.png';
import winner from '../assets/wine_game_UI/SCREEN 2/WINNER.png';
import wineGlass from '../assets/wine_game_UI/SCREEN 2/wine glass.png';

interface GameResultDialogProps {
  isOpen: boolean;
  won: boolean;
  result: string;
  resultLabel: string;
  onAction: () => void;
  onNewPlayer?: () => void;
  onExit?: () => void;
  allowReplay?: boolean;
  variant?: 'default' | 'stop-clock';
}

export function GameResultDialog({ isOpen, won, result, resultLabel, onAction, onNewPlayer, onExit, allowReplay = true, variant = 'default' }: GameResultDialogProps) {
  const t = useTranslation();
  const language = useGameStore((state) => state.settings.language);
  const stopClock = variant === 'stop-clock';
  const title = stopClock
    ? won ? 'CHEERS TO THE PERFECT 23!' : 'EVERY POUR IS WORTH THE CHEERS!'
    : won ? 'Congratulations!' : 'Thank you for playing!';
  return (
    <Modal title={t(title)} isOpen={isOpen} onClose={onAction} dismissible={false}
      maxWidth={stopClock ? '870px' : '540px'} className={`game-result-dialog${stopClock ? ` event-dialog stop-clock-result ${won ? 'is-win' : 'is-miss'}` : ''}`}
      overlayClassName={stopClock ? 'event-modal-overlay stop-clock-overlay' : ''}
      headingDecoration={stopClock && (
        <svg className={`stop-clock-result-art${won ? ' is-win' : ''}`} viewBox={won ? '210 145 440 140' : '390 150 100 115'} aria-hidden="true" focusable="false">
          <image href={won ? congratulations : soClose} width="909" height={won ? '802' : '714'} />
        </svg>
      )}
      actions={<>
        {onNewPlayer && <button type="button" className={`btn result-primary${stopClock ? ' event-button' : ''}`} data-dialog-autofocus onClick={onNewPlayer}><UserRoundPlus aria-hidden="true" />{t(stopClock && !won ? 'CHEERS TO YOU!' : 'Next player')}</button>}
        {allowReplay && <button type="button" className="privacy-details-link result-replay" onClick={onAction}><RotateCcw aria-hidden="true" />{t('Play again')}</button>}
        {onExit && <button type="button" className="privacy-details-link" onClick={onExit}><ArrowLeft aria-hidden="true" />{t('Game menu')}</button>}
      </>}>
      {stopClock && <div className={`stop-clock-celebration ${won ? 'is-win' : 'is-miss'}`} aria-hidden="true">
        {Array.from({ length: won ? 12 : 8 }, (_, index) => <i key={index} style={{ left: `${6 + index * 8}%`, animationDelay: `${index * -0.25}s` }} />)}
      </div>}
      <div className={`game-result-summary ${won ? 'is-win' : 'is-gameover'}`}>
        {!stopClock && (won ? <Trophy aria-hidden="true" /> : <Wine aria-hidden="true" />)}
        {stopClock && won && <img className="stop-clock-result-glass" src={wineGlass} alt="" />}
        <span>{t(resultLabel)}</span>
        <strong>{result}</strong>
      </div>
      {stopClock && (
        <>
          {won && <div className="stop-clock-winner">
            {language === 'en' && <img src={winner} alt="" />}
            <span className={language === 'en' ? 'event-sr-only' : undefined}>{t("You're a winner!")}</span>
          </div>}
          {won ? <>
            <p className="stop-clock-result-message">{t("Congratulations! You've made every second count!")}</p>
            <p className="stop-clock-result-message">{t("Thank you for being part of our 23-year journey. Here's to more great ideas, milestones, and moments worth celebrating!")}</p>
            <p className="stop-clock-result-message stop-clock-redemption">{t('Please present this screen to our event ambassador to claim your prize.')}</p>
          </> : <p className="stop-clock-result-message">{t('Not quite the perfect pour, but worth the cheers! Thank you for being part of our journey!')}</p>}
        </>
      )}
    </Modal>
  );
}