import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import { UserContext } from "../../context/UserContext";
import { useApi } from "../../hooks/useApi";
import { dropdownSvg, profileSvg, chatSvg2, loadingSvg } from "../layout/svg";

const API_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";

const UsersList = () => {
  const { apiFetch } = useApi();
  const { token } = useContext(UserContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  const [hoverUserId, setHoverUserId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const [loading, setLoading] = useState(false);

  const currentUserId = token
    ? (() => {
        try {
          const p = jwtDecode(token);
          return p.id || p.userId || p.sub;
        } catch {
          return null;
        }
      })()
    : null;

  useEffect(() => {
    apiFetch(`/api/teams`)
      .then((r) => r.json())
      .then(setTeams)
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    const q = new URLSearchParams({
      page,
      limit,
      search,
      sort: sortOption,
    });

    setLoading(true);
    apiFetch(`/api/users?${q}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users);
        setTotalPages(data.totalPages);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  }, [page, search, sortOption]);

  useEffect(() => {
    setPage(1);
  }, [search, sortOption]);

  const startChat = async (otherId) => {
    const res = await apiFetch(`/api/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userA: currentUserId, userB: otherId }),
    });
    const chat = await res.json();
    setOpenDropdownId(null);
    navigate("/chats", { state: { chatId: chat._id } });
  };

  const handleCheckboxChange = (value) => {
    setSortOption((current) => (current === value ? "" : value));
  };

  return (
    <div className="max-w-8xl mx-auto mt-10 p-6">
      <div className="relative">
        <div className="absolute -top-12 left-15 bg-gray-800 text-white text-2xl font-semibold px-10 py-2 rounded-t-md">
          Explorar usuarios
        </div>

        <div className="bg-gray-100 p-10 rounded-md pt-6">
          <div className="flex flex-col md:flex-row gap-6">

            <div className="md:w-1/5 bg-white p-6 rounded-md border border-gray-200 space-y-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Filtros</h3>
              <div>
                <label
                  htmlFor="search"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Buscar usuario
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Nombre del usuario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-600 mb-2">
                  Ordenar por
                </span>
                <div className="space-y-2">
                  <label className="flex items-center text-gray-700">
                    <input
                      type="checkbox"
                      checked={sortOption === "alpha-asc"}
                      onChange={() => handleCheckboxChange("alpha-asc")}
                      className="form-checkbox h-4 w-4 cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Alfabético A → Z
                    </span>
                  </label>
                  <label className="flex items-center text-gray-700">
                    <input
                      type="checkbox"
                      checked={sortOption === "alpha-desc"}
                      onChange={() => handleCheckboxChange("alpha-desc")}
                      className="form-checkbox h-4 w-4 cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Alfabético Z → A
                    </span>
                  </label>
                  <label className="flex items-center text-gray-700">
                    <input
                      type="checkbox"
                      checked={sortOption === "with-team-first"}
                      onChange={() => handleCheckboxChange("with-team-first")}
                      className="form-checkbox h-4 w-4 cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Con equipo primero
                    </span>
                  </label>
                  <label className="flex items-center text-gray-700">
                    <input
                      type="checkbox"
                      checked={sortOption === "without-team-first"}
                      onChange={() => handleCheckboxChange("without-team-first")}
                      className="form-checkbox h-4 w-4 cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Sin equipo primero
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="md:w-full">
              <div onClick={() => setOpenDropdownId(null)}>
                {loading ? (
                  <div className="col-span-full flex justify-center items-center py-20">
                    {loadingSvg()}
                  </div>
                ) : (
                  <ul className="grid xs:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
                    {users.map((user) => {
                      const team = teams.find((t) => t.id === user.equip_id);
                      const isLinkHovered = hoverUserId === user.id;

                        return (
                        <li
                          key={user.id}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-gray-400 cursor-pointer transition rounded-md relative"
                        >
                          <div className="flex items-center gap-4 flex-1 p-2 rounded transition">
                          <img
                            src={ user.foto ? API_URL + user.foto : `${API_URL}/uploads/default-user.png`}
                            alt={user.nombre}
                            className="w-14 h-14 rounded-full object-cover"
                          />
                          <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                            {user.nombre}
                            </h2>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                            {team ? (
                              <Link
                              to={`/teams/${team.id}`}
                              onClick={(e) => e.stopPropagation()}
                              onMouseEnter={() => setHoverUserId(user.id)}
                              onMouseLeave={() => setHoverUserId(null)}
                              className={`flex items-center p-1 rounded transition ${
                                isLinkHovered ? "text-[#f0b921]" : ""
                              }`}
                              >
                              <img
                                src={team.foto ? API_URL + team.foto : `${API_URL}/uploads/default-team.png`}
                                alt={team.nombre || "Sin equipo"}
                                className="w-4 h-4 mr-1 rounded-full object-cover"
                              />
                              <span className="font-semibold">
                                {team.nombre}
                              </span>
                              </Link>
                            ) : (
                              <span>Sin equipo</span>
                            )}
                            </div>
                          </div>
                          </div>

                          <div className="relative ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(
                                  openDropdownId === user.id ? null : user.id
                                );
                              }}
                              className="text-gray-600 hover:bg-gray-100 py-2 transition rounded-full focus:outline-none cursor-pointer"
                            >
                              {dropdownSvg()}
                            </button>

                            {openDropdownId === user.id && (
                              <ul
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-2 w-45 bg-gray-100 py-2 rounded-md z-10"
                              >
                                {user.id !== currentUserId && (
                                  <li>
                                  <button
                                    onClick={() => startChat(user.id)}
                                    className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-200 transition text-gray-800 cursor-pointer"
                                  >
                                    {chatSvg2()}
                                    Enviar mensaje
                                  </button>
                                  </li>
                                )}
                                <li>
                                  <Link
                                    to={`/users/${user.id}`}
                                    onClick={() => setOpenDropdownId(null)}
                                    className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-200 transition text-gray-800"
                                  >
                                    {profileSvg()}
                                    Ver perfil
                                  </Link>
                                </li>
                              </ul>
                            )}
                          </div>
                        </li>
                      );
                    })}

                    {users.length === 0 && (
                      <p className="col-span-full text-center text-gray-500">
                        No se encontraron usuarios.
                      </p>
                    )}
                  </ul>
                )}
              </div>

              {!loading && users.length > 0 && (
                <div className="flex justify-center items-center mt-6 space-x-4">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-900 transition text-white rounded-full disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span>
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-900 transition text-white rounded-full disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersList;
