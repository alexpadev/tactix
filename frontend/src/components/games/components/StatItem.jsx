import React from 'react';
import { Link } from 'react-router-dom';
import { TYPES } from "./statTypes";
import { useApi } from '../../../hooks/useApi';
import {acceptSvg, cancelSvg3} from '../../layout/svg';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

export default function StatItem({
  stat,
  matchId,
  token,
  setStats,
  setError,
  game,
  allStats
}) {
  const { apiFetch } = useApi();
  const onVote = async isValid => {
    setError('');
    try {
      const resp = await apiFetch(`/api/statistics/${stat.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ valido: isValid ? 1 : 0 })
      });
      if (!resp.ok) throw new Error('Error al votar');

      const updated = await apiFetch(`/api/statistics/match/${matchId}`);
      const data = await updated.json();
      setStats(data.map(s => ({
        ...s,
        my_vote: s.my_vote != null ? String(s.my_vote) : null
      })));
    } catch (e) {
      setError(e.message);
    }
  };

  // Votos válidos/invalidos
  const valid   = parseInt(stat.valid_votes, 10)   || 0;
  const invalid = parseInt(stat.invalid_votes, 10) || 0;
  const total   = valid + invalid;
  const percent = total > 0 ? Math.round((valid / total) * 100) : 0;

  const hue     = percent * 1.2;
  const bgColor = `hsl(${hue}, 90%, 80%)`;
  const hasVoted= stat.my_vote === "1" || stat.my_vote === "0";

  // Lista de jugadores
  const allPlayers = [...game.members1, ...game.members2];

  // Si es 'match_end', calculamos quién tiene más 'goal' en allStats
  const renderMatchEndResult = () => {
    const statsArr = allStats || [];
    console.log("allStats", statsArr)
    // filtrar goles creíbles
    const goals = statsArr.filter(s => {
      if (s.tipo !== 'goal') return false;
      const v  = parseInt(s.valid_votes, 10)   || 0;
      const iv = parseInt(s.invalid_votes, 10) || 0;
      const tot = v + iv;
      return tot > 0 && (v / tot) >= 0.75;
    });

    console.log(game.members1)
    console.log(game.members2)
    console.log(goals)

    const team1Ids = new Set(game.members1.map(m => m.usuario_id));
    const team2Ids = new Set(game.members2.map(m => m.usuario_id));

    const count1 = goals.filter(g => team1Ids.has(g.jugador_id)).length;
    const count2 = goals.filter(g => team2Ids.has(g.jugador_id)).length;

    console.log("count1", count1)
    console.log("count2", count2)

    if (count1 > count2) return `Ganador: ${game.equipo1}`;
    if (count2 > count1) return `Ganador: ${game.equipo2}`;
    return 'Empate';
  };

  const typeLabel = TYPES.find(x => x.value === stat.tipo)?.label || stat.tipo;
  const playerName = stat.jugador_id
    ? allPlayers.find(p => p.usuario_id === stat.jugador_id)?.nombre 
      || `Jugador #${stat.jugador_id}`
    : null;

  return (
    <li className="p-4 px-5 rounded-lg" style={{ backgroundColor: bgColor }}>
      <div className="flex justify-between items-center">
        <div>
          <p>
            <strong className="text-gray-800">{typeLabel}</strong>
            {playerName && (
              <>
                {' '}–{' '}
                <Link
                  to={`/users/${stat.jugador_id}`}
                  className="text-gray-800 font-semibold hover:text-yellow-500 transition"
                >
                  {playerName}
                </Link>
              </>
            )}
            {stat.tipo === 'match_end' && (
              <span className="ml-2 text-yellow-700 font-semibold">
                {renderMatchEndResult()}
              </span>
            )}
          </p>
          {stat.extra_data && (
            <p className="text-sm text-gray-600">
              Info: {JSON.stringify(stat.extra_data)}
            </p>
          )}
        </div>
        <div className="text-sm font-medium">
          {percent}% válido
        </div>
      </div>

      <div className="mt-2 space-x-4">
        {hasVoted ? (
          <p className="text-sm text-gray-700 mt-1">
            Votaste: <strong>{stat.my_vote === "1" ? 'válida' : 'inválida'}</strong>
          </p>
        ) : (
          <>
          <div className="items-center flex gap-2">
  <button onClick={() => onVote(true)}  className="px-1 py-2 cursor-pointer transition text-white">
              {acceptSvg()}
            </button>
            <button onClick={() => onVote(false)} className="py-2 cursor-pointer font-semibold">
              {cancelSvg3()}
            </button>
          </div>
          
          </>
        )}
        <p className="text-sm text-gray-700 mt-1">
          ({total} voto{total !== 1 ? "s" : ""})
        </p>
        <p className="text-sm text-gray-700 mt-1">
          {new Date(stat.timestamp).toLocaleString('es-ES', {
            weekday: 'long',
            year:    'numeric',
            month:   'long',
            day:     'numeric',
            hour:    '2-digit',
            minute:  '2-digit',
            second:  '2-digit'
          })}
        </p>
      </div>
    </li>
  );
}
