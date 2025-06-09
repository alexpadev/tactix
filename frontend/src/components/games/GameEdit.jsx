import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';

const API = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";
export default function GameEdit() {
  const { apiFetch } = useApi();
  const { id } = useParams();
  const { token } = useContext(UserContext);
  const nav = useNavigate();

  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/api/games/${id}`)
      .then(r => r.json())
      .then(g => {
        setForm({
          fecha_inicio: g.fecha_inicio.slice(0,16),
          ubicacion_x: g.ubicacion_x||'',
          ubicacion_y: g.ubicacion_y||'',
          mvp_usuario_id: g.mvp_usuario_id||'',
          equipo1_id: g.equipo1_id,
          equipo2_id: g.equipo2_id
        });
      });
    apiFetch(`/api/teams`)
      .then(r => r.json())
      .then(setTeams);
  }, [id, token]);

  const onChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const resp = await apiFetch(`/api/games/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.error || resp.statusText);
      }
      nav(`/games/${id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl mb-4">Editar Partido</h2>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label>Fecha y hora</label>
          <input
            type="datetime-local"
            name="fecha_inicio"
            value={form.fecha_inicio||''}
            onChange={onChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            name="ubicacion_x"
            value={form.ubicacion_x}
            onChange={onChange}
            placeholder="X"
            className="w-1/2 border p-2 rounded"
          />
          <input
            type="number"
            name="ubicacion_y"
            value={form.ubicacion_y}
            onChange={onChange}
            placeholder="Y"
            className="w-1/2 border p-2 rounded"
          />
        </div>
        <div>
          <label>MVP (ID)</label>
          <input
            name="mvp_usuario_id"
            value={form.mvp_usuario_id}
            onChange={onChange}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label>Equipo 1</label>
          <select
            name="equipo1_id"
            value={form.equipo1_id}
            onChange={onChange}
            className="w-full border p-2 rounded"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Equipo 2</label>
          <select
            name="equipo2_id"
            value={form.equipo2_id}
            onChange={onChange}
            className="w-full border p-2 rounded"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Límite de jugadores</label>
          <input
            type="number"
            name="player_num"
            value={form.player_num}
            onChange={onChange}
            min="1"
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <button type="submit" className="w-full bg-yellow-500 text-white py-2 rounded">
          Guardar
        </button>
      </form>
    </div>
  );
}
