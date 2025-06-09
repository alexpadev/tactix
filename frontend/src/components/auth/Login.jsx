import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from '../../hooks/useApi';

export const Login = () => {
  const { apiFetch } = useApi();
  const { setToken } = useContext(UserContext);
  const [email, seteMail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState("");
  
  const login = async (email, password) => {
    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        localStorage.setItem("token2", data.token);
        navigate("/");
        window.location.reload();
      } else {
        console.log("Credenciales inválidas:", data.error);
        setError("Credenciales inválidas");
      }
    } catch (err) {
      console.error("Error de inicio de sesión:", err);
      setError("Error de inicio de sesión");
    }
  };

  return (
    <div className="mt-30 bg-white flex flex-col justify-center items-center px-4">
      <div className="border border-gray-300 bg-white p-6 rounded-lg w-full max-w-md md:max-w-lg">
        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-8">
          Iniciar sesión
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Correo electrónico:
            </label>
            <input
              id="email"
              type="text"
              placeholder="Correo"
              className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => seteMail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña:
            </label>
            <input
              id="password"
              type="password"
              placeholder="Contraseña"
              className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">
              {error}
            </p>
          )}

          <button
            onClick={() => login(email, password)}
            className="font-medium cursor-pointer mt-4 w-full bg-gray-800 text-white py-2 rounded-full hover:bg-gray-900 transition"
          >
            Iniciar sesión
          </button>

          <div className="text-center">
            <span>¿No tienes cuenta? </span>
            <Link
              to="/register"
              className="font-bold text-yellow-500 hover:text-yellow-400 transition"
            >
              Regístrate aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
