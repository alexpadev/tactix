import React, { useState } from 'react';
import StatItem from './StatItem';

export default function StatList({
  matchId,
  token,
  game,
  allStats,
  stats,
  setStats,
  setError,
  showOnlyCredible = false,
  hideUnvoted = false        // nuevo prop
}) {
  const [showUnvoted, setShowUnvoted] = useState(false);

  if (!stats || stats.length === 0) {
    return <p className="text-gray-500">Todavía no hay estadísticas.</p>;
  }

  const unvotedStats = stats.filter(stat => {
    const valid = parseInt(stat.valid_votes) || 0;
    const invalid = parseInt(stat.invalid_votes) || 0;
    return valid + invalid === 0;
  });

  const votedStats = stats
    .filter(stat => {
      const valid = parseInt(stat.valid_votes) || 0;
      const invalid = parseInt(stat.invalid_votes) || 0;
      const total = valid + invalid;
      if (total === 0) return false;
      if (!showOnlyCredible) return true;
      return (valid / total) >= 0.75;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {votedStats.map(stat => (
          <StatItem
            game={game}
            key={stat.id}
            stat={stat}
            matchId={matchId}
            token={token}
            setStats={setStats}
            setError={setError}
            allStats={allStats}
          />
        ))}
      </ul>
    </div>
  );
}
