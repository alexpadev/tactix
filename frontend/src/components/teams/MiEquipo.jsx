import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import Pizarra from "./Pizarra";
import Chat from "../chat/Chat";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useApi } from '../../hooks/useApi';
import {
  exitSvg,
  fillDeleteSvg,
  deleteSvg,
  acceptSvg,
  cancelSvg3,
  dropdownSvg,
  chatSvg2,
  profileSvg,
  loadingSvg
} from "../layout/svg";

const API = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";

export default function MiEquipo() {
  const { apiFetch } = useApi();
  const { token, setHasTeam } = useContext(UserContext);
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("Chat");
  const [anuncios, setAnuncios] = useState([]);
  const [nuevoAnuncio, setNuevoAnuncio] = useState("");
  const [groupChatId, setGroupChatId] = useState(null);

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventsOfDay, setEventsOfDay] = useState([]);
  const [newEvent, setNewEvent] = useState({
    titulo: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin: ""
  });

  const [requests, setRequests] = useState([]);
  const [openMemberDropdownId, setOpenMemberDropdownId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMemberDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/profile`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setUserId(data.id))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (userId == null) return;
    apiFetch(`/api/teams/my`)
      .then(res => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(team => setTeamDetails(team))
      .catch(err => console.error("Error al cargar equipo:", err))
      .finally(() => setLoading(false));
  }, [userId, token]);

  useEffect(() => {
    if (!teamDetails) return;
    console.log("teamDetails", teamDetails);
    apiFetch(`/api/teams/${teamDetails.id}/announcements`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(setAnuncios)
      .catch(() => setAnuncios([]));
  }, [teamDetails, token]);

  useEffect(() => {
    if (!teamDetails) return;
    apiFetch(`/api/teams/${teamDetails.id}/chat`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setGroupChatId(data.chatId))
      .catch(console.error);
  }, [teamDetails, token]);

  useEffect(() => {
    if (!teamDetails) return;
    apiFetch(`/api/teams/${teamDetails.id}/calendar`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(setCalendarEvents)
      .catch(() => setCalendarEvents([]));
  }, [teamDetails, token]);

  useEffect(() => {
    const start = new Date(selectedDate).setHours(0, 0, 0, 0);
    const end = new Date(selectedDate).setHours(23, 59, 59, 999);
    setEventsOfDay(
      calendarEvents.filter(evt => {
        const ts = new Date(evt.fecha_inicio).getTime();
        return ts >= start && ts <= end;
      })
    );
  }, [selectedDate, calendarEvents]);

  const isCaptain = teamDetails?.miembros?.some(
    m => m.usuario_id === userId && m.titulo === "capitan"
  );

  useEffect(() => {
    if (!teamDetails || !token) return;
    if (!isCaptain) {
      setRequests([]);
      return;
    }
    apiFetch(`/api/teams/${teamDetails.id}/requests`)
      .then(res => {
        if (res.status === 403) return [];
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [teamDetails, token, isCaptain]);

  const leaveTeam = async () => {
    const res = await apiFetch(`/api/teams/${teamDetails.id}/leave`, { method: "POST" });
    if (res.ok) {
      setHasTeam(false);
      navigate("/teams");
    } else {
      alert("Error al salir del equipo");
    }
  };

  const deleteTeam = async () => {
    if (!window.confirm("¿Eliminar equipo?")) return;
    const res = await apiFetch(`/api/teams/${teamDetails.id}`, { method: "DELETE" });
    if (res.ok) {
      setHasTeam(false);
      navigate("/teams");
    } else {
      alert("Error al eliminar equipo");
    }
  };

  const handleCrearAnuncio = async () => {
    if (!nuevoAnuncio.trim()) return;
    const res = await apiFetch(`/api/teams/${teamDetails.id}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: nuevoAnuncio.trim() })
    });
    if (res.ok) {
      setNuevoAnuncio("");
      const updated = await apiFetch(`/api/teams/${teamDetails.id}/announcements`).then(r => r.json());
      setAnuncios(updated);
    }
  };

  const handleCrearEvento = async () => {
    const { titulo, fecha_inicio, fecha_fin } = newEvent;
    if (!titulo.trim() || !fecha_inicio || !fecha_fin) {
      return alert("Rellena título, fecha inicio y fin.");
    }
    const res = await apiFetch(`/api/teams/${teamDetails.id}/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEvent)
    });
    if (res.ok) {
      setNewEvent({ titulo: "", descripcion: "", fecha_inicio: "", fecha_fin: "" });
      const evs = await apiFetch(`/api/teams/${teamDetails.id}/calendar`).then(r => r.json());
      setCalendarEvents(evs);
    }
  };

  const handleApprove = async uid => {
    const res = await apiFetch(`/api/teams/${teamDetails.id}/requests/${uid}/approve`, { method: "POST" });
    if (res.ok) {
      setRequests(requests.filter(r => r.usuario_id !== uid));
      const fresh = await apiFetch(`/api/teams/${teamDetails.id}`).then(r => r.json());
      setTeamDetails(fresh);
    }
  };

  const handleReject = async uid => {
    const res = await apiFetch(`/api/teams/${teamDetails.id}/requests/${uid}/reject`, { method: "POST" });
    if (res.ok) {
      setRequests(requests.filter(r => r.usuario_id !== uid));
    }
  };

  const handleKick = async uid => {
    if (!window.confirm("¿Estás seguro de expulsar a este jugador?")) return;
    const res = await apiFetch(`/api/teams/${teamDetails.id}/kick/${uid}`, { method: "POST" });
    if (res.ok) {
      setOpenMemberDropdownId(null);
      const fresh = await apiFetch(`/api/teams/${teamDetails.id}`).then(r => r.json());
      setTeamDetails(fresh);
    } else {
      alert("Error al expulsar jugador.");
    }
  };

  const handleStartChat = async otherId => {
    const res = await apiFetch(`/api/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userA: userId, userB: otherId })
    });
    const { chatId, _id } = await res.json();
    setOpenMemberDropdownId(null);
    navigate("/chats", { state: { chatId: chatId || _id } });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        {loadingSvg()}
      </div>
    );
  }
  if (!teamDetails) return <p className="text-center mt-10 text-xl">No estás en ningún equipo.</p>;

  const { nombre, premium, miembros, foto } = teamDetails;
  const tabs = ["Chat","Pizarra","Anuncios","Calendario","Solicitudes","Encuestas"];

  return (
    <div className="max-w-8xl mx-auto mt-8 py-3 px-4 md:px-15 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">

      <aside className="bg-gray-50 p-4 md:p-6 rounded-lg w-full md:w-80 overflow-y-auto max-h-[80vh]">
        <h2 className="text-xl font-bold mb-4">Miembros</h2>

        {console.log("Miembros:", teamDetails)}
        <ul className="space-y-4">
          {miembros.map(m => (
            <li key={m.usuario_id} className="flex items-center justify-between p-2 rounded relative">
              <div className="flex items-center space-x-3">
                <img
                  src={m.foto ? API + m.foto : API + "/uploads/default-avatar.png"}
                  alt={m.nombre}
                  className="w-12 h-12 sm:w-13 sm:h-13 rounded-full"
                />
                <div>
                  <p className="font-semibold text-lg">{m.nombre}</p>
                  <p className="text-sm text-gray-500">{m.titulo}</p>
                </div>
              </div>
              {m.usuario_id !== userId && (
                <div className="relative">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setOpenMemberDropdownId(openMemberDropdownId === m.usuario_id ? null : m.usuario_id);
                    }}
                    className="text-gray-600 hover:bg-gray-100 p-1 rounded-full focus:outline-none"
                  >
                    {dropdownSvg()}
                  </button>
                  {openMemberDropdownId === m.usuario_id && (
                    <ul className="absolute right-0 mt-2 w-50 bg-gray-100 py-2 rounded-lg z-10">
                      <li>
                        <button
                          onClick={() => handleStartChat(m.usuario_id)}
                          className="w-full px-4 py-2 hover:bg-gray-100 text-gray-800 flex items-center gap-2"
                        >
                          {chatSvg2()} Enviar mensaje
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            setOpenMemberDropdownId(null);
                            navigate(`/users/${m.usuario_id}`);
                          }}
                          className="w-full px-4 py-2 hover:bg-gray-100 text-gray-800 flex items-center gap-2"
                        >
                          {profileSvg()} Ver perfil
                        </button>
                      </li>
                      {isCaptain && (
                        <li>
                          <button
                            onClick={() => handleKick(m.usuario_id)}
                            className="w-full px-4 py-2 hover:bg-gray-100 text-red-800 flex items-center gap-2"
                          >
                            {exitSvg()} Expulsar
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>

      <main className="w-full">

        <div className="bg-gray-50 p-4 md:p-6 rounded-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {foto && (
              <img
                src={foto ? API + foto : `${API}/uploads/user_placeholder.png`}
                alt={`${nombre} logo`}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full"
              />
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{nombre}</h1>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                premium ? "bg-yellow-500 text-gray-800" : "bg-gray-200 text-gray-800"
              }`}>
                {premium ? "Premium" : "No premium"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={leaveTeam}
              className="px-4 py-2 border-2 border-red-700 text-red-700 hover:text-white hover:bg-red-700 rounded-full transition"
            >
              {exitSvg()}
            </button>
            {isCaptain && (
              <button
                onClick={deleteTeam}
                className="px-4 py-2 bg-red-700 text-white rounded-full hover:bg-red-800 transition"
              >
                {deleteSvg()}
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 overflow-x-auto">
          <nav className="flex flex-nowrap space-x-4 sm:space-x-8 text-lg sm:text-xl">
            {tabs.map(tab => {
              const label = tab === "Solicitudes" ? `Solicitudes (${requests.length})` : tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`font-semibold whitespace-nowrap ${
                    activeTab === tab
                      ? "text-[#f0b921] border-b-2 border-[#ffc31f]"
                      : "text-gray-700 hover:text-black"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          {activeTab === "Pizarra" && <Pizarra />}

          {activeTab === "Chat" &&
            (groupChatId ? (
              <Chat chatId={groupChatId} />
            ) : (
              <div className="flex justify-center items-center py-20">
                {loadingSvg()}
              </div>
            ))}

          {activeTab === "Anuncios" && (
            <>
              {isCaptain && (
                <div className="mb-4">
                  <h1 className="text-2xl font-bold text-gray-800 mb-4">Anuncios</h1>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded mb-2"
                    rows="3"
                    placeholder="Escribe un nuevo anuncio..."
                    value={nuevoAnuncio}
                    onChange={e => setNuevoAnuncio(e.target.value)}
                  />
                  <button
                    onClick={handleCrearAnuncio}
                    className="px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition"
                  >
                    Publicar anuncio
                  </button>
                </div>
              )}
              {anuncios.length === 0 ? (
                <p className="text-gray-600">No hay anuncios.</p>
              ) : (
                anuncios.map(a => (
                  <div key={a.id} className="border-b border-gray-300 py-3">
                    <p className="text-sm text-gray-500">{new Date(a.fecha).toLocaleString()}</p>
                    <p className="text-gray-800">{a.contenido}</p>
                    <p className="text-xs text-gray-400">— {a.autor || "Anónimo"}</p>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "Calendario" && (
            <div className="space-y-6">
              {isCaptain && (
                <div className="space-y-2 mb-4">
                  <h1 className="text-2xl font-bold text-gray-800 mb-4">Calendario</h1>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Título del evento"
                    value={newEvent.titulo}
                    onChange={e => setNewEvent({ ...newEvent, titulo: e.target.value })}
                  />
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded"
                    rows="2"
                    placeholder="Descripción (opcional)"
                    value={newEvent.descripcion}
                    onChange={e => setNewEvent({ ...newEvent, descripcion: e.target.value })}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="datetime-local"
                      className="flex-1 p-2 border border-gray-300 rounded"
                      value={newEvent.fecha_inicio}
                      onChange={e => setNewEvent({ ...newEvent, fecha_inicio: e.target.value })}
                    />
                    <input
                      type="datetime-local"
                      className="flex-1 p-2 border border-gray-300 rounded"
                      value={newEvent.fecha_fin}
                      onChange={e => setNewEvent({ ...newEvent, fecha_fin: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={handleCrearEvento}
                    className="px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition"
                  >
                    Añadir evento
                  </button>
                </div>
              )}
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="overflow-auto">
                  <Calendar
                    onChange={setSelectedDate}
                    value={selectedDate}
                    tileClassName={({ date, view }) =>
                      view === "month" &&
                      calendarEvents.some(evt => {
                        const d = new Date(evt.fecha_inicio);
                        return d.toDateString() === date.toDateString();
                      })
                        ? "has-event"
                        : null
                    }
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Eventos del {selectedDate.toLocaleDateString()}
                  </h3>
                  {eventsOfDay.length === 0 ? (
                    <p className="text-gray-600">No hay eventos este día.</p>
                  ) : (
                    eventsOfDay.map(evt => (
                      <div key={evt.id} className="border-b border-gray-300 py-2">
                        <p className="font-medium text-gray-800">{evt.titulo}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(evt.fecha_inicio).toLocaleTimeString()} – {new Date(evt.fecha_fin).toLocaleTimeString()}
                        </p>
                        {evt.descripcion && <p className="text-gray-800">{evt.descripcion}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Solicitudes" && (
            isCaptain ? (
              requests.length === 0 ? (
                <p className="text-gray-600">No hay solicitudes pendientes.</p>
              ) : (
                <ul className="space-y-4">
                  {requests.map(r => (
                    <li key={r.usuario_id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <img
                          src={r.foto ? API + r.foto : API + "/uploads/default-avatar.png"}
                          alt={r.nombre}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <span className="text-gray-800">
                          <span
                            className="font-bold hover:underline cursor-pointer"
                            onClick={() => navigate(`/users/${r.usuario_id}`)}
                          >
                            {r.nombre}
                          </span>{" "}
                          ha solicitado unirse al equipo
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(r.usuario_id)} className="px-2 py-2 text-white bg-green-600 rounded-full hover:bg-green-700 transition">
                          {acceptSvg()}
                        </button>
                        <button onClick={() => handleReject(r.usuario_id)} className="px-2 py-2 text-white bg-red-600 rounded-full hover:bg-red-700 transition">
                          {cancelSvg3()}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <p>No tienes permisos para ver solicitudes.</p>
            )
          )}

          {activeTab === "Encuestas" && (
            <EncuestasTab teamId={teamDetails.id} apiFetch={apiFetch} isCaptain={isCaptain} />
          )}
        </div>
      </main>
    </div>
  );
}

function EncuestasTab({ teamId, apiFetch, isCaptain }) {
  const [polls, setPolls] = useState([]);
  const [newPoll, setNewPoll] = useState({ pregunta: "", opciones: ["", ""] });

  const fetchPolls = () => {
    apiFetch(`/api/teams/${teamId}/polls`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(setPolls)
      .catch(console.error);
  };

  useEffect(fetchPolls, [teamId, apiFetch]);

  const vote = async (pollId, opcion_id) => {
    await apiFetch(`/api/teams/${teamId}/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opcion_id })
    });
    fetchPolls();
  };

  const createPoll = async () => {
    if (!newPoll.pregunta.trim() || newPoll.opciones.some(o => !o.trim())) {
      return alert("Rellena pregunta y todas las opciones.");
    }
    const res = await apiFetch(`/api/teams/${teamId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPoll)
    });
    if (res.ok) {
      setNewPoll({ pregunta: "", opciones: ["", ""] });
      fetchPolls();
    }
  };

  return (
    <div className="space-y-6">
      {isCaptain && (
        <div className="space-y-2 rounded mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Encuestas</h3>
          <input
            type="text"
            placeholder="Pregunta"
            className="w-full p-2 border border-gray-300 rounded"
            value={newPoll.pregunta}
            onChange={e => setNewPoll({ ...newPoll, pregunta: e.target.value })}
          />
          {newPoll.opciones.map((opt, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Opción ${i + 1}`}
              className="w-full p-2 border border-gray-300 rounded"
              value={opt}
              onChange={e => {
                const ops = [...newPoll.opciones];
                ops[i] = e.target.value;
                setNewPoll({ ...newPoll, opciones: ops });
              }}
            />
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => setNewPoll({ ...newPoll, opciones: [...newPoll.opciones, ""] })}
              className="px-3 py-1 text-xl font-bold rounded-full border border-gray-300"
            >
              +
            </button>
            <button
              onClick={createPoll}
              className="px-3 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition"
            >
              Crear encuesta
            </button>
          </div>
        </div>
      )}
      {polls.length === 0 ? (
        <p className="text-gray-600">Todavía no hay ninguna encuesta.</p>
      ) : (
        polls.map(p => (
          <div className="border-b border-gray-300 py-2" key={p.id}>
            <p className="font-semibold mb-2">{p.pregunta}</p>
            {p.opciones.map(o => (
              <button
                key={o.id}
                onClick={() => vote(p.id, o.id)}
                className={`block w-full sm:w-2/3 text-left py-2 px-3 mb-1 rounded-lg ${
                  p.miVoto === o.id
                    ? "bg-green-200 text-green-900 font-semibold"
                    : "hover:bg-gray-100 text-gray-800 transition"
                }`}
              >
                {o.texto} — {o.votos} voto{o.votos !== 1 && "s"}{p.miVoto === o.id && " (tu elección)"}
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
