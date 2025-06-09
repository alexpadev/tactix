import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl:        require('leaflet/dist/images/marker-icon.png'),
  shadowUrl:      require('leaflet/dist/images/marker-shadow.png'),
});

function LocationPicker({ form, setForm, apiFetch }) {
  const [markerPos, setMarkerPos] = useState(
    form.ubicacion_x && form.ubicacion_y
      ? [form.ubicacion_x, form.ubicacion_y]
      : null
  );

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setMarkerPos([lat, lng]);
      setForm(f => ({
        ...f,
        ubicacion_x: lat,
        ubicacion_y: lng,
        address: 'Cargando…'
      }));
      try {
        const res = await apiFetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
        const { address } = await res.json();
        setForm(f => ({ ...f, address }));
      } catch {
        setForm(f => ({ ...f, address: 'Ubicación desconocida' }));
      }
    }
  });

  return markerPos ? (
    <Marker position={markerPos}>
      <Popup>
        {form.address || 'Sin dirección aún'}
      </Popup>
    </Marker>
  ) : null;
}

export default function GameCreate() {
  const { apiFetch } = useApi();
  const { token } = useContext(UserContext);
  const [form, setForm] = useState({
    fecha_inicio: '',
    ubicacion_x: '',
    ubicacion_y: '',
    address: '',
    player_num: 1,
  });
  const [error, setError] = useState('');
  const nav = useNavigate();

  const onChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    const payload = {
      fecha_inicio: form.fecha_inicio,
      ubicacion_x: form.ubicacion_x || null,
      ubicacion_y: form.ubicacion_y || null,
      direccion: form.address,
      asUser: true,
      player_num: Number(form.player_num),
    };

    try {
      const resp = await apiFetch(`/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.error || resp.statusText);
      }
      const g = await resp.json();
      nav(`/games/${g.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-md sm:max-w-2xl mx-auto mt-30 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-2xl mb-4 font-semibold text-gray-700 text-center">
          Crear Partido
        </h2>
        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold">
              Fecha y hora
            </label>
            <input
              type="datetime-local"
              name="fecha_inicio"
              value={form.fecha_inicio}
              onChange={onChange}
              required
              className="w-full border border-gray-300 p-2 rounded-lg mt-2"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold">
              Límite de jugadores
            </label>
            <input
              type="number"
              name="player_num"
              value={form.player_num}
              onChange={onChange}
              min="1"
              required
              className="w-full border border-gray-300 p-2 rounded-lg mt-2"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold">
              Selecciona ubicación en el mapa
            </label>
            <MapContainer
              center={[40.4168, -3.7038]}
              zoom={13}
              className="w-full h-64 sm:h-[350px] mt-2 rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker 
                form={form} 
                setForm={setForm} 
                apiFetch={apiFetch}
              />
            </MapContainer>
            <p className="mt-2 text-sm text-gray-600">
              Dirección: {form.address || '—'}
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-gray-800 hover:bg-gray-900 transition cursor-pointer font-semibold text-white py-2 rounded-full"
          >
            Crear Partido
          </button>
        </form>
      </div>
    </div>
  );
}
