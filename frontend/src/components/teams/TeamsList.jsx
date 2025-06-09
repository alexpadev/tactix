import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';
import { loadingSvg } from '../layout/svg';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

const TeamsList = () => {
  const { apiFetch } = useApi();
  const { token, hasTeam } = useContext(UserContext);
  const navigate = useNavigate();

  const [teams, setTeams]                 = useState([]);
  const [search, setSearch]               = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showPremium, setShowPremium]     = useState(false);
  const [showFree, setShowFree]           = useState(false);
  const [minMembers, setMinMembers]       = useState('');
  const [maxMembers, setMaxMembers]       = useState('');

  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/teams`)
      .then(res => res.json())
      .then(data => setTeams(data))
      .catch(err => console.error('Error cargando equipos', err))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredTeams = teams.filter(team => {
    const count = team.miembros.length;
    const matchesSearch =
      team.nombre.toLowerCase().includes(search.toLowerCase());
    const matchesAvailability =
      !onlyAvailable || count < team.limite_miembros;
    let matchesPremium = true;
    if (showPremium || showFree) {
      matchesPremium =
        (showPremium && team.premium) || (showFree && !team.premium);
    }
    const matchesMin =
      minMembers === '' || count >= Number(minMembers);
    const matchesMax =
      maxMembers === '' || count <= Number(maxMembers);

    return (
      matchesSearch &&
      matchesAvailability &&
      matchesPremium &&
      matchesMin &&
      matchesMax
    );
  });

  useEffect(() => {
    setPage(1);
  }, [
    search,
    onlyAvailable,
    showPremium,
    showFree,
    minMembers,
    maxMembers,
  ]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredTeams.length / limit));
    setTotalPages(pages);
    if (page > pages) {
      setPage(pages);
    }
  }, [filteredTeams, page]);

  const startIdx    = (page - 1) * limit;
  const endIdx      = startIdx + limit;
  const currentTeams = filteredTeams.slice(startIdx, endIdx);

  const handleJoin = async (teamId) => {
    await apiFetch(`/api/teams/${teamId}/join`, {
      method: 'POST',
    });
    navigate('/teams/my');
  };

  return (
    <div className="max-w-8xl mx-auto mt-10 p-6">
      <div className="relative">
        <div className="absolute -top-12 left-15 bg-gray-800 text-white text-2xl font-semibold px-10 py-2 rounded-t-md">
          Explorar equipos
        </div>

        <div className="bg-gray-100 p-10 rounded-md pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/5 bg-white p-6 rounded-md border border-gray-200 space-y-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Filtros</h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="search"
                    className="block text-sm font-medium text-gray-600 mb-1"
                  >
                    Buscar equipo
                  </label>
                  <input
                    id="search"
                    type="text"
                    placeholder="Nombre del equipo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-white w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-gray-600">
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={() => setOnlyAvailable(!onlyAvailable)}
                      className="form-checkbox h-4 w-4 cursor-pointer"
                    />
                    <span className="text-sm">Solo equipos disponibles</span>
                  </label>
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-600 mb-1">
                    Tipo de equipo
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center text-gray-700">
                      <input
                        type="checkbox"
                        checked={showPremium}
                        onChange={() => setShowPremium(prev => !prev)}
                        className="form-checkbox h-4 w-4 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-yellow-500">Premium</span>
                    </label>
                    <label className="flex items-center text-gray-700">
                      <input
                        type="checkbox"
                        checked={showFree}
                        onChange={() => setShowFree(prev => !prev)}
                        className="form-checkbox h-4 w-4 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-gray-400">No premium</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="minMembers"
                    className="block text-sm font-medium text-gray-600 mb-1"
                  >
                    Mínimo miembros
                  </label>
                  <input
                    id="minMembers"
                    type="number"
                    placeholder="0"
                    value={minMembers}
                    onChange={(e) => setMinMembers(e.target.value)}
                    className="bg-white w-1/3 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="maxMembers"
                    className="block text-sm font-medium text-gray-600 mb-1"
                  >
                    Máximo miembros
                  </label>
                  <input
                    id="maxMembers"
                    type="number"
                    placeholder="100"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    className="bg-white w-1/3 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>

            <div className="md:w-full">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  {loadingSvg()}
                </div>
              ) : currentTeams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 6xl:grid-cols-3 gap-6">
                  {currentTeams.map((team) => (
                    <Link
                      to={`/teams/${team.id}`}
                      key={team.id}
                      className="p-6 bg-white rounded-md border border-gray-200 hover:border-gray-400 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <img
                            src={team.foto ? API + team.foto : API + '/uploads/default-team.png'}
                            alt={team.nombre}
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-full flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-1 truncate">
                              {team.nombre}
                            </h3>
                            <span
                              className={`text-xs py-1 px-2 rounded-full font-medium ${
                                team.premium
                                  ? 'bg-yellow-400 text-gray-700 border border-gray-700'
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}
                            >
                              {team.premium ? 'Premium' : 'No premium'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 sm:mt-0 text-right">
                          <span className="text-sm font-semibold text-gray-600 block truncate">
                            {team.miembros.length || 0}/{team.limite_miembros}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  No se encontraron equipos.
                </p>
              )}

              {!loading && filteredTeams.length > 0 && (
                <div className="flex justify-center items-center mt-6 space-x-4">
                  <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-900 transition text-white rounded-full disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span>
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-900 transition text-white rounded-full disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamsList;