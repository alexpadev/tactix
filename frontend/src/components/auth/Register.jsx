import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../../context/UserContext";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from '../../hooks/useApi';

export const Register = () => {
  const { apiFetch } = useApi();
  const { setToken } = useContext(UserContext);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    fecha_nacimiento: '',
    foto: null,
  });
  const [preview, setPreview] = useState('http://localhost:3000/uploads/user_placeholder.png');
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleInputChange = (e) => {
    const { id, value, files } = e.target;

    if (id === 'foto' && files && files[0]) {
      const file = files[0];
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setFormData({ ...formData, foto: file });
    } else {
      setFormData({ ...formData, [id]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Correo electrónico no válido");
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) {
      setError("La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.");
      return;
    }

    const data = new FormData();
    data.append("nombre", formData.nombre);
    data.append("email", formData.email);
    data.append("password", formData.password);
    data.append("fecha_nacimiento", formData.fecha_nacimiento);
    if (formData.foto) data.append("foto", formData.foto);

    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        body: data,
      });
      const resData = await response.json();
      if (response.ok) {
        setToken(resData.token);
        localStorage.setItem("token2", resData.token);
        navigate("/");
      } else {
        setError(resData.error || "Error en el registro");
      }
    } catch (err) {
      console.error("Error de registro:", err);
      setError("Error del servidor");
    }
  };

  return (
    <div className="mt-30 bg-white flex flex-col justify-center items-center px-4">
      <div className="border border-gray-300 bg-white p-6 rounded-lg w-full max-w-3xl">
        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">
          Crear cuenta
        </h2>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8"
          encType="multipart/form-data"
        >
          <div className="w-full md:w-1/3 flex flex-col items-center">
            <img
              src={preview}
              alt="Preview"
              className="w-40 h-40 md:w-60 md:h-60 object-cover rounded-md border border-gray-200"
            />
            <label
              htmlFor="foto"
              className="mt-4 cursor-pointer inline-block px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition"
            >
              Seleccionar foto
              <input
                id="foto"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInputChange}
              />
            </label>
            {formData.foto && (
              <p className="mt-2 text-sm text-gray-600 truncate max-w-xs text-center">
                {formData.foto.name}
              </p>
            )}
          </div>

          <div className="w-full md:flex-1 space-y-4">
            <div>
              <label
                htmlFor="nombre"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre:
              </label>
              <input
                id="nombre"
                type="text"
                required
                placeholder="Usuario"
                className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Correo electrónico:
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="Correo"
                className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                onChange={handleInputChange}
              />
            </div>

            <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
              <div className="w-full md:flex-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contraseña:
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Contraseña"
                  className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  onChange={handleInputChange}
                />
              </div>

              <div className="w-full md:flex-1">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirmar contraseña:
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="Contraseña"
                  className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
              <div className="w-full md:flex-1">
                <label
                  htmlFor="fecha_nacimiento"
                  className="block text-sm font-medium text-gray-700"
                >
                  Fecha de nacimiento:
                </label>
                <input
                  id="fecha_nacimiento"
                  type="date"
                  required
                  className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center md:text-left">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="font-semibold cursor-pointer mt-4 w-full bg-gray-800 text-white py-2 rounded-full hover:bg-gray-900 transition"
            >
              Registrarse
            </button>

            <div className="text-center">
              <span>¿Ya tienes cuenta? </span>
              <Link
                to="/login"
                className="font-bold text-yellow-500 hover:text-yellow-400"
              >
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
