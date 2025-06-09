import React, { useState, useMemo } from 'react';
import StatForm from './StatForm';
import StatList from './StatList';
import StatTimeline from './StatTimeline';
import StatItem from './StatItem';

export default function StatisticsSection({
  stats,
  matchId,
  token,
  newType,
  setNewType,
  newExtra,
  setNewExtra,
  setStats,
  setError,
  game,
  isPast
}) {
  const [onlyCredible, setOnlyCredible] = useState(false);
  const [selectedId, setSelectedId]     = useState(null);
  const [showUnvoted, setShowUnvoted]   = useState(false);
  const [showAll, setShowAll]           = useState(true);
  const allStats = stats || [];

  // — existing start/end logic —
  const matchStart = new Date(game.fecha_inicio);
  const statTimes  = allStats.map(s => new Date(s.timestamp).getTime());
  const minStat    = statTimes.length ? Math.min(...statTimes) : matchStart.getTime();
  const maxStat    = statTimes.length ? Math.max(...statTimes) : matchStart.getTime();

  const effectiveStart = useMemo(
    () => new Date(Math.min(matchStart.getTime(), minStat)),
    [matchStart, minStat]
  );
  const effectiveEnd = new Date(maxStat);

  // credible = ≥75% valid votes
  const credibleStats = useMemo(
    () => allStats.filter(s => {
      const v = +s.valid_votes || 0;
      const iv = +s.invalid_votes || 0;
      const total = v + iv;
      return total > 0 && (v / total) >= 0.75;
    }),
    [allStats]
  );

  // — new: has the match already ended credibly? —
  const matchEnded = credibleStats.some(s => s.tipo === 'match_end');

  // timeline uses only credibleStats (or all if toggled—but per spec always credible)
  const timelineStats = useMemo(
    () => [...allStats].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    ),
    [allStats]
  );

  // unvoted = no votes at all
  const unvotedStats = useMemo(
    () => allStats.filter(s => {
      const v = +s.valid_votes || 0;
      const iv = +s.invalid_votes || 0;
      return (v + iv) === 0;
    }),
    [allStats]
  );

  // selected event details
  const selectedStats = useMemo(
    () => timelineStats.filter(s => s.id === selectedId),
    [timelineStats, selectedId]
  );

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-2xl text-gray-800 font-semibold mb-4">Estadísticas</h3>

      <label className="flex items-center text-sm mb-4 text-gray-700">
        <input
          type="checkbox"
          className="mr-2 cursor-pointer"
          checked={onlyCredible}
          onChange={() => { setOnlyCredible(!onlyCredible); setSelectedId(null); }}
        />
        Mostrar solo estadísticas creíbles (≥ 75 %)
      </label>
      <p className="text-xs text-gray-500 mb-6">
        * Solo las estadísticas con un % de validez superior al 75% se considerarán reales y contarán para perfiles.
      </p>

      {matchEnded ? (
        <div className="mb-4 text-red-600">
          ⚠️ El partido ha finalizado. No se pueden añadir nuevas estadísticas.
        </div>
      ) : !isPast ? (
        <div className="text-gray-500 text-sm mt-2">
          El partido aún no ha empezado. No se pueden añadir estadísticas.
        </div>
      ) : (
        <StatForm
          matchId={matchId}
          token={token}
          newType={newType}
          setNewType={setNewType}
          newExtra={newExtra}
          setNewExtra={setNewExtra}
          setStats={setStats}
          setError={setError}
          game={game}
          matchEnded={matchEnded}
          isPast={isPast}
        />
      )}


      
      {timelineStats.length > 0 && (
        <div className="mb-6">
          <StatTimeline
            stats={timelineStats}
            startTime={effectiveStart}
            endTime={effectiveEnd}
            onSelect={setSelectedId}
            selected={selectedId}
            onlyCredible={onlyCredible}
          />
          {selectedStats.length > 0 && (
            <div className="mt-4">
              <h4 className="text-lg text-gray-800 font-semibold mb-2">
                Evento a las {new Date(selectedStats[0].timestamp).toLocaleTimeString()}
              </h4>
              <StatList
                matchId={matchId}
                token={token}
                stats={selectedStats}
                setStats={setStats}
                setError={setError}
                game={game}
                allStats={allStats}
              />
            </div>
          )}
        </div>
      )}

      {/* 2) Estadísticas sin votar */}
      {unvotedStats.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">
              Estadísticas sin votar ({unvotedStats.length})
            </h4>
            <button
              onClick={() => setShowUnvoted(!showUnvoted)}
              className="text-gray-800 text-sm font-semibold"
            >
              {showUnvoted ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {showUnvoted && (
            <ul className="space-y-4">
              {unvotedStats.map(stat => (
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
          )}
        </div>
      )}

      {/* 3) Todas las estadísticas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-medium text-gray-800">Estadísticas</h4>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-gray-800 text-sm font-bold cursor-pointer hover:text-yellow-500 transition"
          >
            {showAll ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {showAll && (
          <StatList
            matchId={matchId}
            token={token}
            stats={allStats}
            allStats={allStats}
            setStats={setStats}
            setError={setError}
            showOnlyCredible={onlyCredible}
            game={game}
          />
        )}
      </div>
    </div>
  );
}
