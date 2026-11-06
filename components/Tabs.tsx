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
    <div className={`tabs-container ${className}`} role="tablist">
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

