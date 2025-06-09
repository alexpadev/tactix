import React, { useEffect, useMemo } from 'react';
import { useApi } from '../../../hooks/useApi';
const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

export default function JoinLeaveControls({
  game, user, userTeam, token,
  joinMode, setJoinMode, slotId, setSlotId, pseudoId, setPseudoId,
  isPositiveInt, setError, stats, isPast
}) {
  const { apiFetch } = useApi();
  const userId = user?.id;
  const inGame = game.members1.concat(game.members2)
    .some(m => m.usuario_id === userId);

  const cnt1 = game.members1.length, cnt2 = game.members2.length;
  const inPseudo1 = game.equipo1_pseudo && game.members1.some(m => m.usuario_id === userId);
  const inPseudo2 = game.equipo2_pseudo && game.members2.some(m => m.usuario_id === userId);
  const pseudoOptions = [
    { id: game.equipo1_id, cnt: cnt1, pseudo: game.equipo1_pseudo, inMe: inPseudo1 },
    { id: game.equipo2_id, cnt: cnt2, pseudo: game.equipo2_pseudo, inMe: inPseudo2 },
  ].filter(t => t.pseudo && !t.inMe && t.cnt < game.player_num);
  const emptySlots = pseudoOptions.filter(o => o.cnt === 0);

  const canJoin = !isPast && !inGame && token && (pseudoOptions.length + emptySlots.length > 0);
  const canSolo = canJoin && pseudoOptions.length > 0;
  const isCaptain = userTeam?.miembros?.some(m => m.usuario_id === userId && m.titulo === 'capitan');
  const canTeam = canJoin && isCaptain && emptySlots.length > 0;

  useEffect(() => {
    const modes = [];
    if (canSolo) modes.push('solo');
    if (canTeam) modes.push('team');
    if (modes.length === 1) {
      setJoinMode(modes[0]);
      setPseudoId('');
      setSlotId('');
    }
  }, [canSolo, canTeam, setJoinMode, setPseudoId, setSlotId]);

  useEffect(() => {
    if (joinMode === 'solo' && pseudoOptions.length === 1) {
      setPseudoId(String(pseudoOptions[0].id));
    }
  }, [joinMode, pseudoOptions, setPseudoId]);

  useEffect(() => {
    if (joinMode === 'team' && emptySlots.length === 1) {
      setSlotId(String(emptySlots[0].id));
    }
  }, [joinMode, emptySlots, setSlotId]);

  const { team1Goals, team2Goals } = useMemo(() => {
    const validGoals = (stats || []).filter(s => {
      if (s.tipo !== 'goal') return false;
      const v  = parseInt(s.valid_votes,   10) || 0;
      const iv = parseInt(s.invalid_votes, 10) || 0;
      return v + iv > 0 && (v / (v + iv)) >= 0.75;
    });

    const team1Ids = new Set(game.members1.map(m => m.usuario_id));
    const team2Ids = new Set(game.members2.map(m => m.usuario_id));

    const makeEventTime = s => {
      const ts = new Date(s.timestamp);
      const timeStr = `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`;
      const player = [...game.members1, ...game.members2]
        .find(m => m.usuario_id === s.jugador_id)
        ?.nombre || `#${s.jugador_id}`;
      return { time: timeStr, player };
    };

    return {
      team1Goals: validGoals
        .filter(g => team1Ids.has(g.jugador_id))
        .map(makeEventTime),
      team2Goals: validGoals
        .filter(g => team2Ids.has(g.jugador_id))
        .map(makeEventTime),
    };
  }, [stats, game]);

  console.log({ team1Goals, team2Goals })

  const onJoin = async () => {
    setError('');
    const body = joinMode === 'team'
      ? { asTeam: true, realTeamId: userTeam.id, slotId: Number(slotId) }
      : { asTeam: false, equipo_id: Number(pseudoId) };
    try {
      const resp = await apiFetch(`/api/games/${game.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
        },
        body: JSON.stringify(body)
      });
      if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
      window.location.reload();
    } catch(e) {
      setError(e.message);
    }
  };

  const onLeave = async () => {
    setError('');
    try {
      const resp = await apiFetch(`/api/games/${game.id}/leave`, {
        method: 'DELETE'
      });
      if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
      window.location.reload();
    } catch(e) {
      setError(e.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Participación</h3>

      {canJoin && (
        <>
          {(canSolo && canTeam) && (
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio" value="solo"
                  checked={joinMode==='solo'}
                  onChange={() => { setJoinMode('solo'); setSlotId(''); }}
                />
                <span>Jugador suelto</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio" value="team"
                  checked={joinMode==='team'}
                  onChange={() => { setJoinMode('team'); setPseudoId(''); }}
                />
                <span>Mi equipo completo</span>
              </label>
            </div>
          )}

          <div className="space-y-4">
            {joinMode === 'solo' && canSolo && (
              <div>
                <p className="mb-1 text-gray-800 font-semibold ml-1">Selecciona equipo:</p>
                <select
                  className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg p-2"
                  value={pseudoId}
                  onChange={e => setPseudoId(e.target.value)}
                  disabled={pseudoOptions.length <= 1}
                >
                  {pseudoOptions.length > 1 && <option value="">Selecciona un equipo...</option>}
                  {pseudoOptions.map((o,i) => (
                    <option key={o.id} value={o.id}>
                      Equipo {i+1} ({o.cnt}/{game.player_num})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {joinMode === 'team' && canTeam && (
              <div>
                <p className="mb-1">Elige hueco a reemplazar:</p>
                <select
                  className="w-full border rounded p-2"
                  value={slotId}
                  onChange={e => setSlotId(e.target.value)}
                  disabled={emptySlots.length <= 1}
                >
                  {emptySlots.length > 1 && <option value="">-- selecciona slot --</option>}
                  {emptySlots.map(o => (
                    <option key={o.id} value={o.id}>
                      Hueco libre ({game.player_num})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onJoin}
              disabled={
                (joinMode==='solo' && !pseudoId) ||
                (joinMode==='team' && !slotId)
              }
              className="w-full py-2 rounded-full cursor-pointer transition bg-gray-800 hover:bg-gray-900 font-semibold text-white disabled:opacity-50"
            >
              Unirse
            </button>
          </div>
        </>
      )}

      {inGame && !isPast && (
        <button
          onClick={onLeave}
          className="mt-6 w-full py-2 rounded bg-red-600 font-semibold rounded-full hover:bg-red-700 cursor-pointer text-white"
        >
          Salir del partido
        </button>
      )}

      {isPast && (
        <div className="mt-6 grid grid-cols-2 gap-6 text-gray-800">
          <div className="space-y-1">
            <h4 className="font-semibold">{game.equipo1}</h4>
            <p className="text-2xl font-bold">{team1Goals.length}</p>
            <ul className="list-none text-sm space-y-0.5">
              {team1Goals.map((e, i) => (
                <li key={i}>
                  {e.time} — {e.player}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold">{game.equipo2}</h4>
            <p className="text-2xl font-bold">{team2Goals.length}</p>
            <ul className="list-none text-sm space-y-0.5">
              {team2Goals.map((e, i) => (
                <li key={i}>
                  {e.time} — {e.player}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!canJoin && !inGame && !isPast && (
        <p className="text-gray-500">No puedes unirte a este partido.</p>
      )}
    </div>
  );
}
