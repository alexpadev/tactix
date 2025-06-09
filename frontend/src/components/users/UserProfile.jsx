import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { UserContext } from "../../context/UserContext";
import { chatSvg3, loadingSvg } from '../layout/svg';
import { jwtDecode } from "jwt-decode";

const statsConfig = [
  { label: 'Partidos jugados', field: 'gamesPlayed' },
  { label: 'Partidos ganados',  field: 'gamesWon'    },
  { label: 'MVPs',              field: 'timesMvp'    },
  { label: 'Goles',             field: 'totalGoals'  },
  { label: 'Asistencias',     field: 'totalAssists'  },
];

const UserProfile = () => {
  const { apiFetch } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useContext(UserContext);

  const [user,   setUser]   = useState(null);
  const [team,   setTeam]   = useState(null);
  const [stats,  setStats]  = useState(null);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

  const currentUserId = token
    ? (() => {
        try {
          const p = jwtDecode(token);
          return p.id || p.userId || p.sub;
        } catch {
          return null;
        }
      })()
    : null;

  const formatDate = iso => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  useEffect(() => {
    apiFetch(`/api/users/${id}`)
      .then(res => {
        if (res.status === 404) throw new Error('Usuario no encontrado');
        if ([401,403].includes(res.status)) {
          navigate('/login', { replace: true });
          return null;
        }
        return res.json();
      })
      .then(data => setUser(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, apiFetch, navigate]);

  useEffect(() => {
    if (!loading && user) {
      apiFetch(`/api/users/${id}/stats`)
        .then(res => {
          if (!res.ok) throw new Error('Error cargando estadísticas');
          return res.json();
        })
        .then(data => setStats(data))
        .catch(err => {
          console.error(err);
          setStats({ gamesPlayed: 0, gamesWon: 0, timesMvp: 0, totalGoals: 0 });
        });
    }
  }, [id, user, loading, apiFetch]);

  useEffect(() => {
    if (!loading && user) {
      apiFetch(`/api/users/${id}/team`)
        .then(res => {
          if (res.status === 404) return null;
          if (!res.ok) throw new Error('Error cargando equipo');
          return res.json();
        })
        .then(data => {
          if (data) setTeam(data);
        })
        .catch(console.error);
    }
  }, [id, user, loading, apiFetch]);

  const startChat = async (otherId) => {
    const res = await apiFetch(`/api/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userA: currentUserId, userB: otherId }),
    });
    const chat = await res.json();
    navigate("/chats", { state: { chatId: chat._id } });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        {loadingSvg()}
      </div>
    );
  }

  if (!user) {
    return <p className="text-center mt-16 text-red-500">Perfil no disponible.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto mt-12 px-4 sm:px-6 lg:px-8">
      <div className="mt-6 bg-white py-10 rounded-lg overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start p-6 space-y-6 sm:space-y-0 sm:space-x-6">
          
          <div className="flex-1 flex flex-col space-y-6">

            <div className="flex flex-col sm:flex-row items-center sm:items-start">
              <img
                src={user.foto ? `${API_URL}${user.foto}` : `${API_URL}/uploads/user_placeholder.png`}
                alt={`${user.nombre} avatar`}
                className="w-60 h-60 sm:w-60 sm:h-60 rounded-full object-cover mb-4 sm:mr-5"
              />
              <div className="mt-0 text-center sm:mt-0 sm:ml-6 sm:text-left">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
                  <h1 className="text-6xl font-bold text-gray-700">
                    {user.nombre}
                  </h1>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => startChat(user.id)}
                      className="hover:bg-gray-50 cursor-pointer p-2 transition text-gray-800 rounded-full"
                    >
                      {chatSvg3()}
                    </button>
                  )}
                  
                </div>
                <div className="mt-6">
                  <p className="text-lg text-gray-700 font-semibold">Correo electrónico</p>
                  <p className="mt-1 text-gray-600">{user.email}</p>
                </div>
                <div>
                  <p className="mt-5 text-lg text-gray-700 font-semibold">Fecha de nacimiento</p>
                  <p className="mt-1 text-gray-600 mb-10">{formatDate(user.fecha_nacimiento)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-6 sm:p-12 bg-gray-50 flex flex-col items-center text-center">
              {team ? (
                <Link
                  to={`/teams/${team.id}`}
                  className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-6"
                >
                  <img
                    src={team.photoPath ? API_URL + team.photoPath : API_URL + "/uploads/default-team.png"}
                    alt={`${team.name} logo`}
                    className="w-40 h-40 rounded-full object-cover"
                  />
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <span className="text-3xl sm:text-4xl font-semibold text-gray-700 hover:text-yellow-500 transition">
                        {team.name}
                      </span>
                      {team.premium ? (
                        <span className="px-2 py-1 text-sm font-medium bg-yellow-500 text-white rounded">
                          Premium
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded">
                          No premium
                        </span>
                      )}
                    </div>
                    <p className="text-md text-gray-600 mt-2">
                      Miembros: {team.memberCount} / {team.limit}
                    </p>
                  </div>
                </Link>
              ) : (
                <p className="text-gray-600 mt-8 text-lg">
                  Este usuario no tiene equipo.
                </p>
              )}
            </div>
          </div>

          <div className="sm:w-1/4 bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Estadísticas</h2>
            <div className="grid grid-cols-1 gap-4">
              {statsConfig.map(({ label, field }) => (
                <div
                  key={field}
                  className="bg-white rounded-lg p-4 border border-gray-300 hover:border-gray-400 transition-shadow"
                >
                  <h3 className="text-sm font-medium text-gray-700">{label}</h3>
                  <p className="mt-2 text-2xl font-semibold text-gray-800">
                    {stats?.[field] ?? '–'}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserProfile;
