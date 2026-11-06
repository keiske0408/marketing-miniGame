import type { ReactNode } from 'react';

interface OverlayProps {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
}

export function Overlay({ title, children, actions }: OverlayProps) {
  return (
    <div className="overlay">
      <div className="card">
        <h2>{title}</h2>
        {children}
        <div className="actions">{actions}</div>
      </div>
    </div>
  );
}
