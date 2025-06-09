// src/components/tournaments/TournamentsList.jsx

import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';
import { cupSvg, loadingSvg } from '../layout/svg';

// Haversine para distancia en km
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

export default function TournamentsList() {
  const { apiFetch } = useApi();
  const { token } = useContext(UserContext);

  const [tournaments, setTournaments] = useState([]);
  const [rolUser, setRolUser] = useState('');
  const [userPos, setUserPos] = useState({ lat: null, lng: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNearby, setFilterNearby] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar rol
  useEffect(() => {
    if (!token) {
      setRolUser('');
      return;
    }
    apiFetch('/api/auth/my/')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => setRolUser(data.rol))
      .catch(() => setRolUser(''));
  }, [token, apiFetch]);

  // Cargar torneos
  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch('/api/tournaments')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const list = Array.isArray(data)
          ? data
          : data && data.id != null
            ? [data]
            : Object.values(data).filter(i => i.id != null);
        setTournaments(list);
      })
      .catch(err => {
        console.error(err);
        setError('No se pudieron cargar los torneos.');
      })
      .finally(() => setLoading(false));
  }, [token, apiFetch]);

  // Geolocalización
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserPos({ lat: coords.latitude, lng: coords.longitude }),
      () => setUserPos({ lat: null, lng: null }),
      { enableHighAccuracy: true }
    );
  }, []);

  // Filtrar y ordenar
  const displayed = useMemo(() => {
    const withDist = tournaments.map(t => ({
      ...t,
      distance:
        userPos.lat != null && t.ubicacion_x != null
          ? calcDistanceKm(userPos.lat, userPos.lng, t.ubicacion_x, t.ubicacion_y)
          : null
    }));

    const term = searchTerm.trim().toLowerCase();
    const bySearch = withDist.filter(t => {
      if (!term) return true;
      return (
        String(t.id).includes(term) ||
        (t.nombre || '').toLowerCase().includes(term) ||
        (t.estado || '').toLowerCase().includes(term)
      );
    });

    if (!filterNearby || userPos.lat == null) return bySearch;
    return bySearch
      .filter(t => t.distance != null && t.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }, [tournaments, userPos, searchTerm, filterNearby, radiusKm]);

  return (
    <div className="max-w-8xl mx-auto mt-10 p-6 min-h-screen al primer">
      <div className="relative">
        <div className="absolute -top-12 left-15 bg-gray-800 text-white text-2xl font-semibold px-10 py-2 rounded-t-md">
          Explorar torneos
        </div>

        <div className="bg-gray-100 p-10 rounded-md pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/5 bg-white p-6 rounded-md border border-gray-200 space-y-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Filtros</h3>
              <div>
                <label htmlFor="searchT" className="block text-sm font-medium text-gray-600 mb-1">
                  Buscar torneo
                </label>
                <input
                  id="searchT"
                  type="text"
                  placeholder="ID, nombre o estado..."
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
                    Permite ubicación para filtrar por proximidad.
                  </p>
                )}
              </div>
              {rolUser === 'admin' && (
                <Link
                  to="/torneos/new"
                  className="block text-center bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-full transition"
                >
                  Crear torneo
                </Link>
              )}
            </div>
            <div className="md:w-full">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  {loadingSvg()}
                </div>
              ) : error ? (
                <p className="text-center text-red-600">{error}</p>
              ) : displayed.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {displayed.map(t => (
                    <Link
                      to={`/torneos/${t.id}`}
                      key={t.id}
                      className="p-6 bg-white rounded-md border border-gray-200 hover:border-gray-400 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-none">
                          {cupSvg()}
                        </div>
                        <div className="flex-1 text-center px-4">
                          <div className="text-xl sm:text-2xl font-bold text-gray-800 hover:text-yellow-500 transition truncate">
                            {t.nombre}
                          </div>
                          <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-sm">
                            <span className="text-gray-600 truncate">
                              {new Date(t.fecha).toLocaleString()}
                            </span>
                            <span
                              className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                                t.estado === 'abierto'
                                  ? 'bg-green-200 border border-green-900 text-green-900'
                                  : 'bg-red-300 border border-red-900 text-red-900 font-semibold'
                              }`}
                            >
                              {t.estado.charAt(0).toUpperCase() + t.estado.slice(1)}
                            </span>
                          </div>
                        </div>

                        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 text-sm">
                          <span className="truncate">
                            {t.inscritos}/{t.max_equipos}
                          </span>
                          {filterNearby && t.distance != null && (
                            <span className="text-gray-500 hidden sm:inline-block">
                              {t.distance.toFixed(1)} km
                            </span>
                          )}
                          <span className="mt-2 sm:mt-0 bg-gray-800 py-2 px-4 rounded-full hover:bg-gray-900 transition text-white text-center w-full sm:w-auto">
                            Ver detalles
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  No hay torneos que mostrar.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
