import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate }              from 'react-router-dom';
import { UserContext }                        from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';
import { jwtDecode } from 'jwt-decode';
import { dropdownSvg, profileSvg, chatSvg2 } from '../layout/svg';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

const TeamDetails = () => {
  const { apiFetch } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, hasTeam, setHasTeam } = useContext(UserContext);

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

  const [userId, setUserId]       = useState(null);
  const [team,   setTeam]         = useState(null);
  const [pending,  setPending]    = useState(false);
  const [requests, setRequests]   = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/profile`)
      .then(r => r.json())
      .then(d => setUserId(d.id))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    apiFetch(`/api/teams/${id}`)
      .then(r => r.json())
      .then(d => setTeam(d))
      .catch(console.error);
  }, [id, token]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/teams/${id}/join/status`)
      .then(r => r.json())
      .then(obj => setPending(Boolean(obj.pending)))
      .catch(console.error);
  }, [id, token]);

  useEffect(() => {
    if (!token || userId == null) return;
    if (team?.miembros.some(m => m.usuario_id === userId && m.titulo === 'capitan')) {
      apiFetch(`/api/teams/${id}/requests`)
        .then(r => r.json())
        .then(list => setRequests(Array.isArray(list) ? list : []))
        .catch(console.error);
    }
  }, [id, token, userId, team]);

  if (!team) {
    return <p className="text-center mt-10 text-xl">Cargando equipo…</p>;
  }

  const isMember  = team.miembros.some(m => m.usuario_id === userId);
  const isCaptain = team.miembros.some(m => m.usuario_id === userId && m.titulo === 'capitan');

  const requestJoin = async () => {
    const res = await apiFetch(`/api/teams/${id}/join`, {
      method: 'POST'
    });
    if (res.ok) {
      setPending(true);
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || 'Error al solicitar unirse');
    }
  };

  const handleApprove = async uId => {
    const res = await apiFetch(`/api/teams/${id}/requests/${uId}/approve`, {
      method: 'POST'
    });
    if (res.ok) {
      setRequests(rs => rs.filter(r => r.usuario_id !== uId));
      apiFetch(`/api/teams/${id}`)
        .then(r => r.json())
        .then(setTeam)
        .catch(console.error);
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || 'Error al aprobar');
    }
  };
  const handleReject = async uId => {
    const res = await apiFetch(`/api/teams/${id}/requests/${uId}/reject`, {
      method: 'POST'
    });
    if (res.ok) {
      setRequests(rs => rs.filter(r => r.usuario_id !== uId));
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || 'Error al rechazar');
    }
  };

  const leaveTeam = async () => {
    const res = await apiFetch(`/api/teams/${id}/leave`, {
      method: 'POST'
    });
    if (res.ok) {
      setHasTeam(false);
      navigate('/teams');
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || 'Error al salir');
    }
  };
  const deleteTeam = async () => {
    if (!window.confirm('¿Eliminar equipo?')) return;
    const res = await apiFetch(`/api/teams/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      setHasTeam(false);
      navigate('/teams');
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || 'Error al eliminar');
    }
  };

  const startChat = async (otherId) => {
    if (!currentUserId) return;
    const res = await apiFetch(`/api/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userA: currentUserId, userB: otherId }),
    });
    const chat = await res.json();
    setOpenDropdownId(null);
    navigate("/chats", { state: { chatId: chat._id } });
  };

  return (
    <div className="max-w-6xl p-6 mx-auto mt-10 bg-white rounded-md">

      <div className="bg-gray-50 p-6 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center">

        <div className="flex flex-col sm:flex-row sm:items-center items-center text-center sm:text-left">
          <img
            src={team.foto ? API + team.foto : API + '/uploads/default-team.png'}
            alt={team.nombre}
            className="w-24 h-24 sm:w-48 sm:h-48 object-cover rounded-full"
          />
          <div className="mt-4 sm:mt-0 sm:ml-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 items-center">
              <h2 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 text-gray-700">
                {team.nombre}
              </h2>
              {team.premium ? (
                <span className="mb-2 text-sm bg-yellow-400 border border-gray-700 text-gray-700 px-3 py-1 rounded-full">
                  Premium
                </span>
              ) : (
                <span className="mb-2 text-sm bg-gray-300 border border-gray-600 text-gray-700 px-3 py-1 rounded-full">
                  No premium
                </span>
              )}
            </div>
            <p className="text-lg mt-2 text-gray-700">
              {team.miembros.length}/{team.limite_miembros} miembros
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex justify-center sm:justify-start">
          {token && !isMember && !hasTeam && !pending && (
            <button
              onClick={requestJoin}
              className="px-5 py-3 bg-gray-800 cursor-pointer font-semibold text-lg transition text-white rounded-full hover:bg-gray-900"
            >
              Solicitar unirse
            </button>
          )}
          {pending && !isMember && (
            <button className="px-5 py-3 cursor-pointer bg-yellow-400 text-gray-800 hover:bg-yellow-500 transition text-lg font-semibold rounded-full">
              Solicitud pendiente
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-8 mt-8 rounded-lg">
        <h3 className="text-2xl mb-8 text-gray-800 font-semibold">Miembros del equipo</h3>
        {team.miembros.length === 0 ? (
          <p>No hay miembros.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {team.miembros.map(m => (
              <li
                key={m.usuario_id}
                className="flex justify-between items-center border border-gray-300 hover:border-gray-400 transition p-4 rounded-lg bg-white relative"
              >
                <div className="flex items-center">
                  <img
                    src={m.foto ? API + m.foto : API + '/uploads/default-avatar.png'}
                    alt={m.nombre}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-gray-800 text-lg">{m.nombre}</p>
                    <p className="text-md text-gray-600">{m.titulo}</p>
                  </div>
                </div>

                <div className="relative ml-4" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(
                        openDropdownId === m.usuario_id ? null : m.usuario_id
                      );
                    }}
                    className="text-gray-600 hover:bg-gray-100 py-2 transition rounded-full focus:outline-none cursor-pointer"
                  >
                    {dropdownSvg()}
                  </button>

                  {openDropdownId === m.usuario_id && (
                    <ul
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 mt-2 w-45 bg-gray-100 py-2 rounded-md z-10"
                    >
                      <li>
                        <button
                          onClick={() => startChat(m.usuario_id)}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-200 transition text-gray-800 cursor-pointer"
                        >
                          {chatSvg2()}
                          Enviar mensaje
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            setOpenDropdownId(null);
                            navigate(`/users/${m.usuario_id}`);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-200 transition text-gray-800 cursor-pointer"
                        >
                          {profileSvg()}
                          Ver perfil
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isCaptain && requests.length > 0 && (
        <div className="bg-white p-6 mt-6 rounded-lg">
          <h3 className="text-xl mb-4">Solicitudes pendientes</h3>
          <ul className="space-y-4">
            {requests.map(r => (
              <li key={r.usuario_id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div className="flex items-center mb-2 sm:mb-0">
                  <img
                    src={r.foto || '/default-avatar.png'}
                    alt={r.nombre}
                    className="w-10 h-10 rounded-full"
                  />
                  <span
                    className="ml-3 cursor-pointer font-semibold"
                    onClick={() => navigate(`/users/${r.usuario_id}`)}
                  >
                    {r.nombre}
                  </span>
                </div>
                <div className="flex space-x-2 justify-start sm:justify-end">
                  <button
                    onClick={() => handleApprove(r.usuario_id)}
                    className="px-3 py-1 bg-green-500 text-white rounded"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleReject(r.usuario_id)}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TeamDetails;
