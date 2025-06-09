import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
      <Popup>{form.address || 'Sin dirección aún'}</Popup>
    </Marker>
  ) : null;
}

export default function CreateTournament() {
  const { apiFetch } = useApi();
  const { token } = useContext(UserContext);
  const navigate = useNavigate();

  const [rolUser, setRolUser] = useState('');
  useEffect(() => {
    if (!token) { setRolUser(''); return; }
    apiFetch('/api/auth/my/')
      .then(r => { if (!r.ok) throw r; return r.json(); })
      .then(data => setRolUser(data.rol))
      .catch(console.error);
  }, [token]);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    fecha: '',
    ubicacion_x: '',
    ubicacion_y: '',
    address: '',
    max_equipos: 16
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!form.nombre.trim() || !form.fecha || form.max_equipos < 2) {
      setError('Nombre, fecha válida y máximo de equipos ≥ 2 son obligatorios');
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiFetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre:      form.nombre,
          descripcion: form.descripcion || null,
          fecha:       form.fecha,
          ubicacion_x: form.ubicacion_x || null,
          ubicacion_y: form.ubicacion_y || null,
          max_equipos: parseInt(form.max_equipos, 10)
        })
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || `Error HTTP ${res.status}`);
      }

      navigate('/torneos');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (rolUser !== 'admin') {
    return (
      <div className="w-full max-w-md sm:max-w-2xl mx-auto mt-20 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg border border-gray-300 p-6 text-center">
          <p className="text-red-600">No tienes permiso para acceder a esta página.</p>
          <Link to="/torneos" className="mt-4 inline-block text-blue-600 hover:underline">
            Volver a torneos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-2xl mx-auto mt-30 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h2 className="text-2xl mb-4 font-semibold text-gray-700 text-center">Crear Torneo</h2>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-700 font-semibold block">Nombre</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="text-gray-700 font-semibold block">Descripción</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
              <label className="text-gray-700 font-semibold block">Fecha y hora</label>
              <input
                type="datetime-local"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div className="w-full sm:w-1/2">
              <label className="text-gray-700 font-semibold block">Máx. Equipos</label>
              <input
                type="number"
                name="max_equipos"
                min="2"
                value={form.max_equipos}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-700 font-semibold block mb-2">
              Selecciona ubicación en el mapa
            </label>
            <MapContainer
              center={[40.4168, -3.7038]}
              zoom={13}
              className="w-full h-64 sm:h-[350px] rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker form={form} setForm={setForm} apiFetch={apiFetch} />
            </MapContainer>
            <p className="mt-2 text-sm text-gray-600">
              Dirección: {form.address || '—'}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full font-semibold text-white py-2 rounded-full bg-gray-800 hover:bg-gray-900 transition"
          >
            {submitting ? 'Guardando...' : 'Crear Torneo'}
          </button>
        </form>
      </div>
    </div>
  );
}
