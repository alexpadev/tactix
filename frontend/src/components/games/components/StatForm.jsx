import React, { useEffect, useState } from 'react';
import { TYPES } from './statTypes';
import { useApi } from '../../../hooks/useApi';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

export default function StatForm({
  matchId,
  token,
  newType,
  setNewType,
  newExtra,
  setNewExtra,
  setStats,
  setError,
  game,
  matchEnded = false,
  isPast
}) {
  const { apiFetch } = useApi();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!game) return;
    const allPlayers = [
      ...game.members1.map(m => ({ id: m.usuario_id, name: m.nombre })),
      ...game.members2.map(m => ({ id: m.usuario_id, name: m.nombre }))
    ];
    setPlayers(allPlayers);
  }, [game]);

  const onCreate = async () => {
    if (!newType) return;
    setError('');
    try {
      const typeObj = TYPES.find(t => t.value === newType);

      // Build request payload
      const payload = {
        partido_id: Number(matchId),
        tipo: newType,
        jugador_id: null,
        equipo_id: null
      };

      if (typeObj.needsPlayer) {
        payload.jugador_id = Number(newExtra);
      } else if (typeObj.needsTeam) {
        payload.equipo_id = Number(newExtra);
      }

      const resp = await apiFetch(`/api/statistics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Error al crear estadística');

      // reset form
      setNewType('');
      setNewExtra('');

      // reload stats
      const updated = await apiFetch(`/api/statistics/match/${matchId}`);
      setStats(await updated.json());
    } catch (e) {
      setError(e.message);
    }
  };

  const current = TYPES.find(t => t.value === newType);

  return (
  <>
      <div className="mb-4">
        <select
          value={newType}
          onChange={e => {
            setNewType(e.target.value);
            setNewExtra('');
          }}
          className="w-full border border-gray-300 p-2 rounded-lg bg-white mb-2"
          disabled={matchEnded}
        >
          <option value="">Selecciona tipo...</option>
          {TYPES.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {current?.needsPlayer && (
          <select
            value={newExtra}
            onChange={e => setNewExtra(e.target.value)}
            className="w-full border border-gray-300 bg-white p-2 rounded-lg mb-2"
            disabled={matchEnded}
          >
            <option value="">Selecciona jugador</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {current?.needsTeam && (
          <select
            value={newExtra}
            onChange={e => setNewExtra(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-lg mb-2"
            disabled={matchEnded}
          >
            <option value="">Selecciona equipo...</option>
            <option value={game.equipo1_id}>
              {game.equipo1} ({game.members1.length}/{game.player_num})
            </option>
            <option value={game.equipo2_id}>
              {game.equipo2} ({game.members2.length}/{game.player_num})
            </option>
          </select>
        )}

        <button
          onClick={onCreate}
          disabled={
            matchEnded ||
            !newType ||
            (current?.needsPlayer && !newExtra) ||
            (current?.needsTeam && !newExtra)
          }
          title={matchEnded ? 'El partido ya finalizó' : undefined}
          className="bg-gray-800 hover:bg-gray-900 cursor-pointer font-semibold text-white py-2 px-4 rounded-full disabled:opacity-50"
        >
          Añadir estadística
        </button>
      </div>    
  </>
);
}