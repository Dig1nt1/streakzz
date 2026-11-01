const MAX_CELLS = 30;

interface StreakChainProps {
  /** Days logged so far. */
  days: number;
  /** Zero-based index of the highlighted day, if any. */
  activeIndex?: number;
  /** Makes each cell a button that selects that day. */
  onSelect?: (index: number) => void;
  size?: "sm" | "lg";
  className?: string;
}

// One cell per logged day, in the flame colour: the streak drawn as a chain.
// Long streaks show their most recent 30 days. The selected day turns white.
export function StreakChain({ days, activeIndex, onSelect, size = "sm", className = "" }: StreakChainProps) {
  const count = Math.min(days, MAX_CELLS);
  const offset = Math.max(0, days - MAX_CELLS);

  if (size === "lg") {
    return (
      <div
        className={`grid gap-1 ${className}`}
        style={{ gridTemplateColumns: `repeat(${Math.max(count, 14)}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`${days} day streak`}
      >
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="h-7 rounded-md bg-flame" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${className}`}
      role={onSelect ? "group" : "img"}
      aria-label={`${days} day streak`}
    >
      {Array.from({ length: count }, (_, i) => {
        const index = i + offset;
        const isActive = index === activeIndex;
        const cell = `block h-2.5 w-4 rounded-[3px] transition-colors ${isActive ? "bg-white" : "bg-flame"}`;
        return onSelect ? (
          <button
            key={index}
            type="button"
            className="-my-2 py-2"
            onClick={() => onSelect(index)}
            aria-label={`Show day ${index + 1}`}
            aria-pressed={isActive}
          >
            <span className={`${cell} hover:opacity-80`} />
          </button>
        ) : (
          <span key={index} className={cell} />
        );
      })}
    </div>
  );
}
