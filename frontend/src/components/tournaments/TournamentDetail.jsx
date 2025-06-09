import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import GameLayout from '../../components/games/components/GameLayout';
import JoinTournamentForm from './JoinTournamentForm';
import { loadingSvg } from '../layout/svg';
import { UserContext } from '../../context/UserContext';
import { jwtDecode } from 'jwt-decode';

export default function TournamentDetail() {
  const { apiFetch } = useApi();
  const { id } = useParams();
  const { token } = useContext(UserContext);

  const [torneo, setTorneo] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userTeam, setUserTeam] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) return;
    try {
      setUser(jwtDecode(token));
    } catch {
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/users/me/team`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(setUserTeam)
      .catch(() => setUserTeam(null));
  }, [token, apiFetch]);

  useEffect(() => {
    async function fetchTournament() {
      setLoading(true);
      setError('');
      try {
        const res  = await apiFetch(`/api/tournaments/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        setTorneo(data.torneo);
        setEquipos(data.equipos || []);
      } catch (err) {
        console.error('Error fetching tournament:', err);
        setError('No se pudo cargar el torneo.');
      } finally {
        setLoading(false);
      }
    }
    fetchTournament();
  }, [id, apiFetch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        {loadingSvg()}
      </div>
    );
  }

  if (error || !torneo) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">{error || 'Torneo no encontrado.'}</p>
      </div>
    );
  }

  return (
    <GameLayout>
      <div className="min-h-screen bg-gray-50 w-7xl p-10 rounded-lg mt-10">
        <div className="border-b border-gray-200 pb-6 mb-6">
          <h2 className="text-5xl text-gray-800 font-bold mb-4">{torneo.nombre}</h2>
          <p className="text-gray-700">
            <strong>Fecha: </strong>
            {new Date(torneo.fecha).toLocaleDateString()}
          </p>
          <p className="text-gray-700 mt-2">
            <strong>Estado: </strong>
            {torneo.estado}
          </p>
          <p className="text-gray-700 mt-2">
            <strong>Ubicación: </strong>
            {torneo.address || 'Ubicación desconocida'}
          </p>
        </div>

        {torneo.estado === 'abierto' && (
          <div className="mb-6">
            <JoinTournamentForm
              torneoId={id}
              currentEquipos={equipos}
              maxEquipos={torneo.max_equipos}
              onJoined={(eq) => setEquipos((prev) => [...prev, eq])}
              onLeft={(eq) =>
                setEquipos((prev) => prev.filter((e) => e.equipo_id !== eq.equipo_id))
              }
              user={user}
              userTeam={userTeam}
            />
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xl text-gray-800 font-semibold">
            Equipos participantes ({equipos.length}/{torneo.max_equipos})
          </h3>
          <ul className="list-none mt-4 space-y-3">
            {equipos.map((e) => (
              <li key={e.equipo_id} className="flex items-center">
                <img
                  src={
                    e.foto
                      ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'}${e.foto}`
                      : `${
                          process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'
                        }/uploads/user_placeholder.png`
                  }
                  alt={`Logo de ${e.nombre}`}
                  className="w-20 h-20 rounded-full object-cover mr-3"
                />
                <Link to={`/teams/${e.equipo_id}`} className="text-xl font-medium text-gray-800 hover:text-yellow-500 transition font-semibold">
                  {e.nombre}
                </Link>
              </li>
            ))}
            {equipos.length === 0 && (
              <li className="text-gray-500 italic">Aún no hay equipos inscritos.</li>
            )}
          </ul>
        </div>

        <div className="mb-6">
          <Link
            to={`/torneos/${id}/bracket`}
            className="inline-block bg-gray-800 text-white px-4 py-2 rounded-full hover:bg-gray-900 transition font-semibold"
          >
            Ver bracket
          </Link>
        </div>
      </div>
    </GameLayout>
  );
}