import React from 'react';
import { TYPES } from "./statTypes";

export default function StatTimeline({
  stats,
  startTime,
  endTime,
  onSelect,
  selected,
  onlyCredible
}) {
  const span = endTime.getTime() - startTime.getTime() || 1;

  const startLabel = startTime.toLocaleTimeString();
  const endLabel   = endTime.toLocaleTimeString();

  const filteredStats = stats.filter(s => {
    if (!onlyCredible) return true;

    const v  = Number(s.valid_votes)   || 0;
    const iv = Number(s.invalid_votes) || 0;
    const total = v + iv;

    return total > 0 && (v / total) >= 0.75;
  });

  return (
    <div className="relative w-full h-12 my-6">
      <div className="absolute inset-0 top-3 h-1 bg-gray-300 rounded" />

      <div className="absolute left-0 bottom-0 text-xs text-gray-600">
        {startLabel}
      </div>
      <div className="absolute right-0 bottom-0 text-xs text-gray-600">
        {endLabel}
      </div>

      {filteredStats.map(s => {
        const t = new Date(s.timestamp).getTime();
        let pct = ((t - startTime.getTime()) / span) * 100;
        pct = Math.max(0, Math.min(100, pct));

        const active = s.id === selected;
        const tooltip = `${new Date(s.timestamp).toLocaleTimeString()} - ${
          TYPES.find(x => x.value == s.tipo)?.label || s.tipo
        }`;

        const v     = Number(s.valid_votes)   || 0;
        const iv    = Number(s.invalid_votes) || 0;
        const total = v + iv;
        const percent = total > 0 ? (v / total) * 100 : 0;

        const hue     = percent * 1.2;
        const light   = active ? '50%' : '80%';
        const bgColor = `hsl(${hue}, 90%, ${light})`;

        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            onMouseEnter={() => onSelect(s.id)}
            title={tooltip}
            className="absolute top-0 w-4 h-8 transform -translate-x-1/2 focus:outline-none"
            style={{ left: `${pct}%` }}
          >
            <div
              className={`w-4 h-4 rounded-full transition-transform ${
                active ? 'scale-125' : ''
              }`}
              style={{ backgroundColor: bgColor }}
            />
          </button>
        );
      })}
    </div>
  );
}
