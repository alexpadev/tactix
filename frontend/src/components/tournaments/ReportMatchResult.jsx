import React, { useState, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';

const API = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";

function ReportMatchResult({ torneoId, match }) {
  const { apiFetch } = useApi();
  const [ganadorId, setGanadorId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const reportar = async () => {
    if (!ganadorId) {
      setMensaje('Selecciona un ganador antes de reportar.');
      return;
    }
    setLoading(true);
    setMensaje('');
    try {
      const res = await apiFetch(`/api/tournaments/${torneoId}/match/${match.id}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ganador_id: parseInt(ganadorId, 10) })
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje(data.message || 'Resultado reportado correctamente.');
      } else {
        setMensaje(data.error || 'Error al reportar resultado.');
      }
    } catch (err) {
      console.error(err);
      setMensaje('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded space-y-2">
      <p className="font-semibold">{match.equipo1} vs {match.equipo2}</p>
      <select
        value={ganadorId}
        onChange={e => setGanadorId(e.target.value)}
        className="border p-1 rounded w-full max-w-xs"
      >
        <option value="">Selecciona ganador</option>
        <option value={match.equipo1_id}>{match.equipo1}</option>
        <option value={match.equipo2_id}>{match.equipo2}</option>
      </select>
      <button
        onClick={reportar}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Reportando...' : 'Reportar resultado'}
      </button>
      {mensaje && <p className="mt-2">{mensaje}</p>}
    </div>
  );
}

export default ReportMatchResult;
