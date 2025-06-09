import React, { useEffect, useState, useMemo, useRef, useContext, useLayoutEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';
import { SingleEliminationBracket, Match } from '@g-loot/react-tournament-brackets';

export default function BracketView() {
  const { id } = useParams();
  const { apiFetch } = useApi();
  const { user } = useContext(UserContext);

  const [torneo, setTorneo] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef();
  const isDragging = useRef(false);
  const dragStart = useRef({ x:0, y:0, scrollLeft:0, scrollTop:0 });
  const scrollPosRef = useRef({ left: 0, top: 0 });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res  = await apiFetch(`/api/tournaments/${id}/bracket`);
        const data = await res.json();
        setTorneo(data.torneo);
        setEquipos(data.equipos.sort((a,b) => a.equipo_id - b.equipo_id));
        if (data.matches?.length) {
          setMatches(data.matches);
        }
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, apiFetch]);

  useEffect(() => {
    if (!torneo || !equipos.length) return;
    if (torneo.estado === 'abierto' && matches.length === 0) {
      setMatches(generateBracket(equipos, torneo.max_equipos));
    }
  }, [torneo, equipos, matches]);

  const bracketData = useMemo(() => {
    if (!matches.length) return [];
    const byRound = matches.reduce((acc,m) => {
      acc[m.ronda] = acc[m.ronda] || [];
      acc[m.ronda].push(m);
      return acc;
    }, {});
    const totalRounds = Math.max(...matches.map(m=>m.ronda));
    return matches.map(m => {
      const idx = byRound[m.ronda].findIndex(x => x.id === m.id);
      const nextMatch = m.ronda < totalRounds
        ? byRound[m.ronda+1][Math.floor(idx/2)].id
        : null;
      return {
        id: m.id,
        name: `${m.equipoA.nombre} vs ${m.equipoB.nombre}`,
        nextMatchId: nextMatch,
        tournamentRoundText: `${m.ronda}`,
        startTime: null,
        state: 'DONE',
        participants: [
          {
            id: m.equipoA.id,
            resultText: m.scoreA != null ? m.scoreA.toString() : '',
            isWinner: m.ganadorId === m.equipoA.id,
            status: m.scoreA != null ? (m.ganadorId === m.equipoA.id ? 'WON' : 'LOST') : null,
            name: m.equipoA.nombre
          },
          {
            id: m.equipoB.id,
            resultText: m.scoreB != null ? m.scoreB.toString() : '',
            isWinner: m.ganadorId === m.equipoB.id,
            status: m.scoreB != null ? (m.ganadorId === m.equipoB.id ? 'WON' : 'LOST') : null,
            name: m.equipoB.nombre
          }
        ]
      };
    });
  }, [matches]);

  const onMouseDown = e => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    };
    containerRef.current.style.cursor = 'grabbing';
  };

  const onMouseMove = e => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    containerRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
    containerRef.current.scrollTop  = dragStart.current.scrollTop  - dy;
  };

  const endDrag = () => {
    isDragging.current = false;
    containerRef.current.style.cursor = 'grab';
  };

  const onWheel = e => {
    e.preventDefault();
    const { scrollLeft, scrollTop } = containerRef.current;
    scrollPosRef.current = { left: scrollLeft, top: scrollTop };
    const delta = -e.deltaY * 0.001;
    setZoom(z => Math.min(2, Math.max(0.5, z + delta)));
  };

  useLayoutEffect(() => {
    const c = containerRef.current;
    if (c) {
      c.scrollLeft = scrollPosRef.current.left;
      c.scrollTop = scrollPosRef.current.top;
    }
  }, [zoom]);

  const generateRandom = () => {
    const newMatches = JSON.parse(JSON.stringify(matches));
    let fillerCount = 0;
    const maxRound = Math.max(...newMatches.map(m => m.ronda));
    newMatches.forEach(m => {
      if (m.ronda === 1) {
        ['equipoA','equipoB'].forEach(side => {
          if (!m[side].id) {
            fillerCount++;
            m[side] = { id: `filler-${fillerCount}`, nombre: `EQUIPO DE RELLENO (num ${fillerCount})` };
          }
        });
      }
    });
    for (let round = 1; round <= maxRound; round++) {
      const roundMatches = newMatches.filter(m => m.ronda === round);
      roundMatches.forEach((m, idx) => {
        const aReal = m.equipoA.id !== null && !`${m.equipoA.id}`.startsWith('filler');
        const bReal = m.equipoB.id !== null && !`${m.equipoB.id}`.startsWith('filler');
        let winnerSide;
        if (aReal && !bReal) winnerSide = 'A';
        else if (!aReal && bReal) winnerSide = 'B';
        else winnerSide = Math.random() < 0.5 ? 'A' : 'B';
        let scoreA = Math.floor(Math.random()*10);
        let scoreB = Math.floor(Math.random()*10);
        if ((winnerSide==='A' && scoreA<=scoreB) || (winnerSide==='B' && scoreB<=scoreA)) {
          if (winnerSide==='A') scoreA = scoreB + 1;
          else scoreB = scoreA + 1;
        }
        m.scoreA = scoreA;
        m.scoreB = scoreB;
        m.ganadorId = winnerSide === 'A' ? m.equipoA.id : m.equipoB.id;
        if (round < maxRound) {
          const next = newMatches.filter(x => x.ronda === round+1)[Math.floor(idx/2)];
          const winnerTeam = winnerSide==='A' ? m.equipoA : m.equipoB;
          if (idx % 2 === 0) next.equipoA = winnerTeam;
          else next.equipoB = winnerTeam;
        }
      });
    }
    setMatches(newMatches);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/tournaments/${id}/bracket`, {
        method: 'POST',
        body: JSON.stringify({ matches })
      });
      if (!res.ok) throw new Error();
      alert('Cuadro guardado correctamente');
    } catch {
      alert('Error al guardar cuadro');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Cargando cuadro…</p>;
  }

  const roundsCount = matches.length
    ? Math.max(...matches.map(m => m.ronda))
    : 0;

  return (
    <div className="max-w-6xl mx-auto mt-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl text-gray-800 font-bold">Cuadro del torneo</h2>
        <button onClick={generateRandom} className="bg-gray-800 text-white px-4 py-3 font-semibold rounded-full cursor-pointer tansition hover:bg-gray-900">
          Generar eventos random
        </button>
        <Link to={`/torneos/${id}`} className="text-gray-800 hover:text-yellow-500 transition cursor-pointer font-semibold">
          ← Volver
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-10">
          {torneo.estado === 'abierto' && user ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Generar & Guardar cuadro'}
            </button>
          ) : (
            <p className="text-gray-500">Aún no hay cuadro generado.</p>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full"
          style={{
            height: '70vh',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            cursor: 'grab'
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onWheel={onWheel}
        >
          <div
            style={{
              minWidth: `${roundsCount * 250}px`,
              minHeight: '100%',
              transform: `scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            <SingleEliminationBracket
              matches={bracketData}
              matchComponent={Match}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function generateBracket(teams, maxSlots) {
  const seeds = teams.map(t => ({ id: t.equipo_id, nombre: t.nombre }));
  const slots = maxSlots;
  const realPairs = Math.floor(seeds.length / 2);
  const totalPairs = slots / 2;
  const empty = { id: null, nombre: '-' };

  const first = [];
  for (let i = 0; i < realPairs; i++) {
    first.push({
      id: `r1-m${i}`,
      ronda: 1,
      equipoA: seeds[2 * i],
      equipoB: seeds[2 * i + 1],
      ganadorId: null
    });
  }
  for (let j = realPairs; j < totalPairs; j++) {
    first.push({
      id: `r1-m${j}`,
      ronda: 1,
      equipoA: empty,
      equipoB: empty,
      ganadorId: null
    });
  }

  const totalRounds = Math.log2(slots);
  const all = [...first];
  for (let r = 2; r <= totalRounds; r++) {
    const pairs = slots / 2 ** r;
    for (let i = 0; i < pairs; i++) {
      all.push({
        id: `r${r}-m${i}`,
        ronda: r,
        equipoA: { id: null, nombre: '' },
        equipoB: { id: null, nombre: '' },
        ganadorId: null
      });
    }
  }
  return all;
}