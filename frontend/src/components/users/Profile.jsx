// src/components/users/Profile.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { UserContext } from '../../context/UserContext';
import { loadingSvg } from '../layout/svg';  // <-- Importamos loadingSvg

const statsConfig = [
  { label: 'Partidos jugados', field: 'gamesPlayed' },
  { label: 'Partidos ganados',  field: 'gamesWon'    },
  { label: 'MVPs',              field: 'timesMvp'    },
  { label: 'Goles totales',     field: 'totalGoals'  },
  { label: 'Asistencias',     field: 'totalAssists'  },
];

export const Profile = () => {
  const { apiFetch }  = useApi();
  const { token }     = useContext(UserContext);
  const navigate      = useNavigate();
  const API_URL       = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

  const [profile,   setProfile]   = useState(null);
  const [stats,     setStats]     = useState({});
  const [team,      setTeam]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState({
    name: '', email: '', birthdate: '', password: '', avatar: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [message,       setMessage]       = useState('');
  const [isEditing,     setIsEditing]     = useState(false);

  const formatDate = iso => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  // Carga perfil
  useEffect(() => {
    apiFetch('/api/profile', { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) navigate('/login');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setProfile(data);
        setForm({
          name: data.name,
          email: data.email,
          birthdate: formatDate(data.birthdate),
          password: '',
          avatar: data.avatar,
        });
        setAvatarPreview(data.avatar);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apiFetch, navigate]);

  // Carga stats
  useEffect(() => {
    if (!profile) return;
    apiFetch(`/api/users/${profile.id}/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setStats({
        gamesPlayed: data.gamesPlayed || 0,
        gamesWon:    data.gamesWon    || 0,
        timesMvp:    data.timesMvp    || 0,
        totalGoals:  data.totalGoals  || 0,
      }))
      .catch(() => setStats({ gamesPlayed:0,gamesWon:0,timesMvp:0,totalGoals:0 }));
  }, [profile, apiFetch, token]);

  // Carga equipo
  useEffect(() => {
    if (!profile) return;
    apiFetch('/api/profile/team')
      .then(res => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => setTeam(data))
      .catch(() => setTeam(null));
  }, [profile, apiFetch, token]);

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = e => {
    const file = e.target.files[0];
    setAvatarFile(file);
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    const formData = new FormData();
    ['name','email','birthdate','password'].forEach(f => formData.append(f, form[f]));
    if (avatarFile) formData.append('avatar', avatarFile);

    apiFetch(`/api/profile`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) navigate('/login');
          return null;
        }
        return res.json();
      })
      .then(resp => {
        if (resp?.message) {
          setMessage(resp.message);
          setIsEditing(false);
          if (resp.avatar) {
            setProfile(p => ({ ...p, avatar: resp.avatar }));
            setAvatarPreview(resp.avatar);
            setAvatarFile(null);
          }
        }
      })
      .catch(console.error);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        {loadingSvg()}
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center mt-16 text-red-500">Perfil no disponible.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto mt-12 px-4 sm:px-6 lg:px-8">
      <div className="mt-6 bg-white py-10 rounded-lg overflow-hidden">
        <div className="flex flex-col sm:flex-row p-6 space-y-6 sm:space-y-0 sm:space-x-6">

          <div className="flex-1 flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-6">

              <div className="relative group">
                <img
                  src={avatarPreview || `${API_URL}/uploads/user_placeholder.png`}
                  alt="Avatar"
                  className="w-60 h-60 rounded-full object-cover"
                />
                {isEditing && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      title="Cambiar imagen"
                    />
                    <div className="absolute bottom-0 w-full text-xs text-white bg-gray-800 bg-opacity-50 text-center py-1">
                      Cambiar
                    </div>
                  </>
                )}
              </div>

              {!isEditing ? (
                <div className="flex-1 space-y-4 text-center sm:text-left">
                  <div>
                    <p className="text-6xl font-bold text-gray-700 mb-6">{profile.name}</p>
                  </div>
                  <div>
                    <p className="mt-1 text-lg text-gray-700 font-semibold">Correo electrónico</p>
                    <p className="mt-1 text-gray-600">{profile.email}</p>
                  </div>
                  <div>
                    <p className="mt-5 text-lg text-gray-700 font-semibold">Fecha de nacimiento</p>
                    <p className="mt-1 text-gray-600 mb-10">
                      {formatDate(profile.birthdate)}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer w-full px-6 py-3 bg-gray-800 text-white font-bold rounded-full hover:bg-gray-900 transition"
                  >
                    Editar Perfil
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 space-y-4">
                  {message && <p className="text-green-600 text-center">{message}</p>}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="mt-1 p-2 w-full border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      className="mt-1 p-2 w-full border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de nacimiento</label>
                    <input
                      name="birthdate"
                      type="date"
                      value={form.birthdate}
                      onChange={handleChange}
                      className="mt-1 p-2 w-full border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nueva contraseña</label>
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      className="mt-1 p-2 w-full border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                    <button
                      type="submit"
                      className="w-full sm:w-3/4 px-6 py-2 bg-gray-800 text-white font-bold rounded-full hover:bg-gray-900 cursor-pointer transition"
                    >
                      Guardar Cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          name: profile.name,
                          email: profile.email,
                          birthdate: formatDate(profile.birthdate),
                          password: '',
                          avatar: profile.avatar,
                        });
                        setAvatarPreview(profile.avatar);
                        setIsEditing(false);
                      }}
                      className="w-full sm:w-auto px-6 py-2 border-2 border-gray-800 text-gray-800 cursor-pointer font-bold rounded-full hover:bg-gray-50 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="rounded-lg p-6 sm:p-12 bg-gray-50 flex flex-col items-center text-center">
              {team ? (
                <Link
                  to={`/teams/my`}
                  className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-4"
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
                        <span className="px-2 py-1 text-sm bg-yellow-500 text-white rounded">
                          Premium
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded">
                          No premium
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-2">
                      Miembros: {team.memberCount} / {team.limit}
                    </p>
                  </div>
                </Link>
              ) : (
                <p className="text-gray-600 mt-8 text-lg">
                  No perteneces a ningún equipo.
                </p>
              )}
            </div>
          </div>

          <div className="sm:w-1/4 bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center sm:text-left">Estadísticas</h2>
            <div className="grid grid-cols-1 gap-4">
              {statsConfig.map(({ label, field }) => (
                <div
                  key={field}
                  className="bg-white rounded-lg p-4 border border-gray-300 hover:border-gray-400 transition-shadow"
                >
                  <h3 className="text-sm font-medium text-gray-700">{label}</h3>
                  <p className="mt-2 text-2xl font-semibold text-gray-800">
                    {stats[field] ?? 0}
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
