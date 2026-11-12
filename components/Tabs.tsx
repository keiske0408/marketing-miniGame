import { soundManager } from '../services/audio';
import { haptics } from '../services/haptics';

interface TabItem {
  id: string;
  label: string;
  badge?: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  const handleSelect = (id: string) => {
    soundManager.playClick();
    haptics.tick();
    onChange(id);
  };

  return (
    <div className={`tabs-container ${className}`} role="tablist" onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || tabs.length === 0) return;
      event.preventDefault();
      const current = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      handleSelect(tabs[next].id);
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>
      {tabs.map((tab) => {
        const isSelected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => handleSelect(tab.id)}
            className={`tab-btn ${isSelected ? 'is-active' : ''}`}
          >
            {tab.label}
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
