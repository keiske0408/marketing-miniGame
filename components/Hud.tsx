interface HudProps {
  score: number;
  level: number;
  time: number;
  maxTime: number;
  matches: number;
  goal: number;
  onPause?: () => void;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function Hud({ score, level, time, maxTime, matches, goal, onPause }: HudProps) {
  const pct = Math.max(0, (time / maxTime) * 100);
  return (
    <header className="hud">
      <Stat label="Score" value={score} />
      <Stat label="Level" value={level} />
      <Stat label="Matches" value={`${matches}/${goal}`} />
      <div className={`stat timer${time <= 8 ? ' low' : ''}`}>
        <span className="label">Time left</span>
        <b>{Math.ceil(time)}s</b>
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
      </div>
      {onPause && (
        <button
          type="button"
          className="hud-pause-btn"
          onClick={onPause}
          aria-label="Pause game"
          title="Pause game"
        >
          ⏸
        </button>
      )}
    </header>
  );
}
