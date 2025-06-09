import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import {jwtDecode} from 'jwt-decode';
import { useApi } from '../../hooks/useApi';

import GameLayout from '../../components/games/components/GameLayout';
import GameInfo from '../../components/games/components/GameInfo';
import JoinLeaveControls from '../../components/games/components/JoinLeaveControls';
import StatisticsSection from '../../components/games/components/StatisticsSection';
import { loadingSvg } from '../../components/layout/svg';

export default function GameDetails() {
  const { apiFetch } = useApi();
  const { id }       = useParams();
  const { token }    = useContext(UserContext);

  const [userTeam, setUserTeam] = useState(null);
  const [user,     setUser]     = useState(null);
  const [game,     setGame]     = useState(null);
  const [stats,    setStats]    = useState([]);
  const [error,    setError]    = useState('');
  const [joinMode, setJoinMode] = useState('solo');
  const [slotId,   setSlotId]   = useState('');
  const [pseudoId, setPseudoId] = useState('');
  const [newType,  setNewType]  = useState('');
  const [newExtra, setNewExtra] = useState('');
  const [loading,  setLoading]  = useState(true);

  const isPositiveInt = v => Number.isInteger(Number(v)) && Number(v) > 0;

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/games/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then(setGame)
      .catch(err => {
        console.error(err);
        setError('No se pudo cargar el partido.');
      })
      .finally(() => setLoading(false));
  }, [id, apiFetch]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/statistics/match/${id}`)
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  }, [id, token, apiFetch]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/users/me/team`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setUserTeam)
      .catch(() => setUserTeam(null));
  }, [token, apiFetch]);

  useEffect(() => {
    if (!token) return;
    try {
      setUser(jwtDecode(token));
    } catch {
      setUser(null);
    }
  }, [token]);

  const [isPast, setIsPast] = useState(false);
  useEffect(() => {
    if (!game) return;
    const now   = new Date();
    const start = new Date(game.fecha_inicio);
    setIsPast(start <= now);
  }, [game]);

  const commonProps = {
    game,
    user,
    userTeam,
    token,
    joinMode,
    setJoinMode,
    slotId,
    setSlotId,
    pseudoId,
    setPseudoId,
    isPositiveInt,
    setError
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        {loadingSvg()}
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">{error || 'Partido no encontrado.'}</p>
      </div>
    );
  }

  return (
    <GameLayout>
      <GameInfo
        game={game}
        address={game.address || 'Ubicación desconocida'}
        loadingAddress={false}
      />

      <JoinLeaveControls {...commonProps} stats={stats} isPast={isPast} />

      <StatisticsSection
        matchId={id}
        token={token}
        stats={stats}
        setStats={setStats}
        newType={newType}
        setNewType={setNewType}
        newExtra={newExtra}
        setNewExtra={setNewExtra}
        setError={setError}
        game={game}
        isPast={isPast}
      />

      {error && <div className="col-span-full text-red-600">{error}</div>}
    </GameLayout>
  );
}
