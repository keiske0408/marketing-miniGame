import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { soundManager } from '../services/audio';
import { useTranslation } from '../services/i18n';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: string;
  className?: string;
  dismissible?: boolean;
}

export function Modal({
  title,
  isOpen,
  onClose,
  children,
  actions,
  maxWidth = '440px',
  className = '',
  dismissible = true,
}: ModalProps) {
  const t = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstControl = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-autofocus]')
      ?? dialogRef.current?.querySelector<HTMLElement>('button');
    firstControl?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (dismissible) {
          soundManager.playClick();
          closeRef.current();
        }
      }
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, dismissible]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="overlay modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={dialogRef}
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) {
          soundManager.playClick();
          onClose();
        }
      }}
    >
      <div className={`card modal-card ${className}`} style={{ maxWidth }}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          {dismissible && <button
            type="button"
            className="modal-close-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            aria-label={t('Close dialog')}
          >
            <X aria-hidden="true" />
          </button>}
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
