import React, { useEffect, useState, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';
import { loadingSvg } from '../layout/svg';

function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function GamesList() {
  const { apiFetch } = useApi();
  const { token } = useContext(UserContext);

  const [games, setGames] = useState([]);
  const [userPos, setUserPos] = useState({ lat: null, lng: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNearby, setFilterNearby] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/games')
      .then(res => res.json())
      .then(data => {
        setGames(data.filter(g => g.ubicacion_x != null && g.ubicacion_y != null));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserPos({ lat: coords.latitude, lng: coords.longitude }),
      () => console.warn('Geolocalización denegada'),
      { enableHighAccuracy: true }
    );
  }, []);

  const displayedGames = useMemo(() => {
    const withDistance = games.map(g => ({
      ...g,
      distance: calcDistanceKm(
        userPos.lat, userPos.lng,
        g.ubicacion_x, g.ubicacion_y
      )
    }));
    const term = searchTerm.trim().toLowerCase();
    const bySearch = withDistance.filter(g => {
      if (!term) return true;
      return (
        String(g.id).includes(term) ||
        (g.equipo1 || '').toLowerCase().includes(term) ||
        (g.equipo2 || '').toLowerCase().includes(term)
      );
    });
    if (!filterNearby || userPos.lat == null) return bySearch;
    return bySearch
      .filter(g => g.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }, [games, userPos, searchTerm, filterNearby, radiusKm]);

  return (
    <div className="max-w-8xl mx-auto mt-10 p-6 min-h-screen">
      <div className="relative">
        <div className="absolute -top-12 left-15 bg-gray-800 text-white text-2xl font-semibold px-10 py-2 rounded-t-md">
          Explorar partidos
        </div>

        <div className="bg-gray-100 p-10 rounded-md pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/5 bg-white p-6 rounded-md border border-gray-200 space-y-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Filtros</h3>
              <div>
                <label htmlFor="searchGames" className="block text-sm font-medium text-gray-600 mb-1">
                  Buscar partido
                </label>
                <input
                  id="searchGames"
                  type="text"
                  placeholder="ID o nombre de equipo..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-white w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    checked={filterNearby}
                    disabled={userPos.lat == null}
                    onChange={e => setFilterNearby(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-orange-500 cursor-pointer"
                  />
                  <span className="text-sm">Solo cercanos</span>
                </label>
                {filterNearby && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={radiusKm}
                      onChange={e => setRadiusKm(Number(e.target.value))}
                      className="bg-white w-1/3 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <span>km</span>
                  </div>
                )}
                {userPos.lat == null && (
                  <p className="text-sm text-gray-500 mt-2">
                    Permite ubicación para proximidad.
                  </p>
                )}
              </div>
              <Link
                to="/games/new"
                className="block text-center bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-full transition"
              >
                Crear partido
              </Link>
            </div>

            <div className="md:w-full">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  {loadingSvg()}
                </div>
              ) : displayedGames.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {displayedGames.map(g => {
                    const eq1Open = g.equipo1_pseudo === 1 && g.equipo1_count === 0;
                    const eq2Open = g.equipo2_pseudo === 1 && g.equipo2_count === 0;
                    const name1 = eq1Open
                      ? 'Abierto'
                      : g.equipo1_pseudo === 1
                      ? 'Solo'
                      : g.equipo1;
                    const name2 = eq2Open
                      ? 'Abierto'
                      : g.equipo2_pseudo === 1
                      ? 'Solo'
                      : g.equipo2 || 'Abierto';
                    const isOpen = name1 === 'Abierto' || name2 === 'Abierto';

                    return (
                      <Link
                        to={`/games/${g.id}`}
                        key={g.id}
                        className="p-5 bg-white rounded-md border border-gray-200 hover:border-gray-400 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                          <div className="w-full sm:w-1/4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                              #{g.id}
                            </h3>
                            <p className="text-gray-600 text-sm hidden sm:block">
                              {new Date(g.fecha_inicio).toLocaleString()}
                            </p>
                          </div>

                          <div className="w-full flex items-center justify-center gap-2">
                            {g.equipo1_pseudo === 1 ? (
                              <span className="text-xl sm:text-3xl font-bold text-gray-800">{name1}</span>
                            ) : (
                              <Link
                                to={`/teams/${g.equipo1_id}`}
                                className="text-xl sm:text-3xl font-bold text-gray-800 hover:text-yellow-500 transition truncate"
                              >
                                {name1}
                              </Link>
                            )}
                            <span className="text-xl sm:text-3xl font-bold text-gray-800">vs</span>
                            {g.equipo2_pseudo === 1 ? (
                              <span className="text-xl sm:text-3xl font-bold text-gray-800">{name2}</span>
                            ) : (
                              <Link
                                to={`/teams/${g.equipo2_id}`}
                                className="text-xl sm:text-3xl font-bold text-gray-800 hover:text-yellow-500 transition truncate"
                              >
                                {name2}
                              </Link>
                            )}
                          </div>

                          <div className="w-full sm:w-1/4 xs:text-center flex flex-col sm:items-end gap-2">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                isOpen
                                  ? 'bg-green-200 border border-green-900 text-green-900'
                                  : 'bg-red-300 border border-red-900 text-red-900 font-semibold'
                              }`}
                            >
                              {isOpen ? 'Abierto' : 'Cerrado'}
                            </span>
                            <span className="text-sm text-gray-800 truncate">
                              {g.equipo1_count + g.equipo2_count}/{g.player_num * 2}
                            </span>
                            {filterNearby && g.distance != null && (
                              <span className="text-sm text-gray-500 hidden sm:inline-block">
                                {g.distance.toFixed(1)} km
                              </span>
                            )}
                            <span className="mt-2 sm:mt-1 bg-gray-800 py-2 px-3 rounded-full hover:bg-gray-900 transition text-white text-center w-full sm:inline-block sm:w-auto">
                              Ver detalles
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500">No hay partidos que mostrar.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
