// src/components/games/components/GameInfo.jsx

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadingSvg } from '../../layout/svg';

export default function GameInfo({ game, address, loadingAddress }) {
  const navigate = useNavigate();
  const start = new Date(game.fecha_inicio);
  const cnt1 = game.members1.length;
  const cnt2 = game.members2.length;

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Partido #{game.id}</h2>
      <p className="mb-2 text-gray-700"><strong>Fecha:</strong> {start.toLocaleString()}</p>
      {start <= new Date() && (
        <p className="text-red-500 mb-4">Este partido ya ha comenzado.</p>
      )}

      <div className="mb-4 flex gap-2">
        <h4 className="text-gray-800"><strong>Dirección:</strong></h4>
        {loadingAddress ? (
          <span className="inline-flex items-center">
            <span className="text-gray-500 text-sm">Cargando dirección…</span>
          </span>
        ) : (
          <p className="text-gray-700">
            {address || 'Coordenadas no disponibles'}
          </p>
        )}
      </div>

      <div className="mb-4">
        <p  className="text-gray-800">
          <strong>Equipo 1:</strong>{' '}
          {game.equipo1_pseudo
            ? 'Solo'
            : (
              <Link to={`/teams/${game.equipo1_id}`} className="text-gray-800 hover:text-yellow-500 transition font-bold">
                {game.equipo1}
              </Link>
            )
          } - {cnt1}/{game.player_num}
        </p>
        <ul className="list-disc list-inside mt-2">
          {game.members1.map(m => (
            <li
              key={m.usuario_id}
              onClick={() => navigate(`/users/${m.usuario_id}`)}
              className="cursor-pointer"
            >
              <span className="font-semibold text-gray-800 hover:text-yellow-500 transition">{m.nombre}</span> <span className="text-gray-600">({m.titulo})</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-gray-800">
          <strong>Equipo 2:</strong>{' '}
          {game.equipo2_pseudo
            ? 'Solo'
            : (
              <Link to={`/teams/${game.equipo2_id}`} className="text-gray-800 hover:text-yellow-500 transition font-bold">
                {game.equipo2}
              </Link>
            )
          } - {cnt2}/{game.player_num}
        </p>
        <ul className="list-disc list-inside mt-2">
          {game.members2.map(m => (
            <li
              key={m.usuario_id}
              onClick={() => navigate(`/users/${m.usuario_id}`)}
              className="cursor-pointer"
            >
              <span className="font-semibold text-gray-800 hover:text-yellow-500 transition">{m.nombre}</span> <span className="text-gray-600">({m.titulo})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
