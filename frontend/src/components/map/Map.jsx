import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadingSvg } from '../layout/svg';
import { useApi } from '../../hooks/useApi';

import blueIconUrl from 'leaflet-color-markers/img/marker-icon-2x-orange.png';
import redIconUrl from 'leaflet-color-markers/img/marker-icon-2x-red.png';
import yellowIconUrl from 'leaflet-color-markers/img/marker-icon-2x-black.png';
import shadowUrl from 'leaflet-color-markers/img/marker-shadow.png';

const gameIcon = new L.Icon({
  iconUrl: blueIconUrl,
  iconRetinaUrl: blueIconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const tournamentIcon = new L.Icon({
  iconUrl: redIconUrl,
  iconRetinaUrl: redIconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: yellowIconUrl,
  iconRetinaUrl: yellowIconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function Recenter({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], zoom ?? map.getZoom());
    }
  }, [lat, lng, zoom, map]);
  return null;
}

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

const Map = () => {
  const { apiFetch } = useApi();
  const navigate = useNavigate();

  const [userPos, setUserPos] = useState({ lat: 40.4168, lng: -3.7038 });
  const [games, setGames] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserPos({ lat: coords.latitude, lng: coords.longitude }),
      () => console.warn('Geolocalización denegada o no disponible'),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [gamesRes, toursRes] = await Promise.all([
          apiFetch('/api/games'),
          apiFetch('/api/tournaments')
        ]);
        const [gamesData, toursData] = await Promise.all([
          gamesRes.json(),
          toursRes.json()
        ]);

        const rawGames = gamesData
          .filter(g => g.ubicacion_x && g.ubicacion_y)
          .map(g => ({ ...g, type: 'game' }));
        const rawTours = toursData
          .filter(t => t.ubicacion_x && t.ubicacion_y)
          .map(t => ({ ...t, type: 'tournament' }));

        setGames(rawGames);
        setTournaments(rawTours);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiFetch]);

  const eventsSorted = useMemo(() => {
    const all = [...games, ...tournaments].map(e => ({
      ...e,
      distance: calcDistanceKm(
        userPos.lat, userPos.lng,
        e.ubicacion_x, e.ubicacion_y
      )
    }));
    return all.sort((a, b) => a.distance - b.distance);
  }, [games, tournaments, userPos]);

  const eventsToShow = useMemo(() => {
    return eventsSorted
      .filter(ev => filterType === 'all' || ev.type === filterType);
  }, [eventsSorted, filterType]);

  const isMobile = windowWidth < 768;

  const tournamentIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });


  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: '100vh'
    }}>
      {isMobile ? (
        <header style={{
          width: '100%',
          padding: '0.5rem 1rem',
          borderBottom: '1px solid #ccc',
          background: '#f9f9f9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="font-semibold text-gray-800">Eventos cercanos</p>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg p-1 bg-white"
            >
              <option value="all">Todos</option>
              <option value="game">Partidos</option>
              <option value="tournament">Torneos</option>
            </select>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>{loadingSvg()}</div>
          ) : (
            <select
              value={focused ? `${focused.type}-${focused.id}` : ''}
              onChange={e => {
                const [type, id] = e.target.value.split('-');
                const ev = eventsToShow.find(x => x.type === type && String(x.id) === id);
                setFocused(ev || null);
              }}
              style={{
                width: '100%', padding: '.5rem', fontSize: '1rem',
                marginTop: '.5rem',
                borderRadius: 4, border: '1px solid #ccc', background: '#fff',
                appearance: 'none', cursor: 'pointer'
              }}
            >
              <option value="">Selecciona un evento...</option>
              {eventsToShow.map(ev => (
                <option
                  key={`${ev.type}-${ev.id}`}
                  value={`${ev.type}-${ev.id}`}
                >
                  [{ev.type === 'game' ? 'Partido' : 'Torneo'}] {' '}
                  {ev.type === 'game'
                    ? `${ev.equipo1_pseudo || ev.equipo1} vs ${ev.equipo2 || 'Abierto'}`
                    : ev.nombre
                  } ({ev.distance.toFixed(1)} km)
                </option>
              ))}
            </select>
          )}
        </header>
      ) : (
        <aside className="w-1/5 overflow-y-auto border-r border-gray-300 p-5">
          <div className="flex justify-between items-center mb-3">
            <p className="font-semibold text-gray-800">Eventos cercanos</p>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg p-1"
            >
              <option value="all">Todos</option>
              <option value="game">Partidos</option>
              <option value="tournament">Torneos</option>
            </select>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              {loadingSvg()}
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {eventsToShow.map(ev => (
                <li
                  key={`${ev.type}-${ev.id}`}
                  onClick={() => setFocused(ev)}
                  style={{
                    marginBottom: '1rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    background: focused?.type === ev.type && focused.id === ev.id
                      ? '#eef'
                      : 'transparent',
                    borderRadius: 4
                  }}
                >
                  <strong className="text-xs text-gray-500">({ev.type === 'game' ? 'Partido' : 'Torneo'})</strong><br />
                  {ev.type === 'game'
                    ? <span className="text-gray-800 font-semibold">{ev.equipo1_pseudo || ev.equipo1} vs {ev.equipo2 || 'Abierto'}</span>
                    : <span className="text-gray-800 font-semibold">{ev.nombre}</span>
                  }
                  <br />
                  <small>
                    <span className="text-gray-700">{ev.address}</span><br />
                    <span className="text-gray-500">{ev.distance.toFixed(2)} km</span>
                  </small>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      <div style={{
        flex: 1,
        height: isMobile ? 'calc(100vh - 88px)' : '100vh'
      }}>
        <MapContainer
          center={[userPos.lat, userPos.lng]}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
        >
          <Recenter
            lat={focused ? focused.ubicacion_x : userPos.lat}
            lng={focused ? focused.ubicacion_y : userPos.lng}
            zoom={focused ? 15 : 13}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
            <Popup>Tú ubicación</Popup>
          </Marker>

          {!loading && eventsToShow.map(ev => (
            <Marker
              key={`${ev.type}-${ev.id}`}
              position={[ev.ubicacion_x, ev.ubicacion_y]}
              icon={ev.type === 'game' ? gameIcon : tournamentIcon}
            >
              <Popup>
                <div className="space-y-4 min-w-[200px]">
                  <strong className="text-xs">
                    {ev.type === 'game'
                      ? `(Partido)`
                      : `(Torneo)`
                    }
                  </strong><br />
                  {ev.type === 'game'
                    ? `${ev.equipo1_pseudo || ev.equipo1} vs ${ev.equipo2 || 'Abierto'}`
                    : ev.nombre
                  }<br />
                  <span className="text-xs">Fecha: {new Date(
                    ev.type === 'game' ? ev.fecha_inicio : ev.fecha
                  ).toLocaleString()}</span><br />
                  <button
                    className="mt-3 cursor-pointer font-semibold hover:text-yellow-500 transition"
                    onClick={() =>
                      navigate(
                        ev.type === 'game'
                          ? `/games/${ev.id}`
                          : `/torneos/${ev.id}`
                      )
                    }
                  >
                    Ver detalles
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Map;
