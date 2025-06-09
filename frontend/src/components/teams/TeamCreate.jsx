import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
const TEAM_PLACEHOLDER = `${API_BASE_URL}/uploads/user_placeholder.png`;

const TeamCreate = () => {
  const { apiFetch } = useApi();
  const { token, setHasTeam } = useContext(UserContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    limite_miembros: 10,
    premium: false,
    foto: null,
  });
  const [preview, setPreview] = useState(TEAM_PLACEHOLDER);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleInputChange = e => {
    const { id, value, type, checked, files } = e.target;

    if (id === 'foto' && files && files[0]) {
      const file = files[0];
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setFormData(prev => ({
        ...prev,
        foto: file,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [id]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    const data = new FormData();
    data.append('nombre', formData.nombre);
    data.append('limite_miembros', formData.limite_miembros);
    data.append('premium', formData.premium ? '1' : '0');
    if (formData.foto) data.append('foto', formData.foto);

    try {
      const resp = await apiFetch(`/api/teams`, {
        method: 'POST',
        body: data,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.error || resp.statusText);
      }

      setHasTeam(true);
      navigate(`/teams/my`);
    } catch (err) {
      setError(err.message || 'Error creando equipo');
    }
  };

  return (
    <div className="mt-30 bg-white flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md md:max-w-3xl bg-white border border-gray-300 rounded-lg p-6 md:p-8">
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-6">
          Crear Nuevo Equipo
        </h2>
        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}


        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8"
          encType="multipart/form-data"
        >
          <div className="w-full md:w-1/3 flex flex-col items-center">
            <img
              src={preview}
              alt="Preview equipo"
              className="w-32 h-32 md:w-56 md:h-56 object-cover rounded-md border border-gray-200"
            />
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
                Nombre del equipo:
              </label>
              <input
                id="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={handleInputChange}
                className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="limite_miembros"
                className="block text-sm font-medium text-gray-700"
              >
                Límite de miembros:
              </label>
              <input
                id="limite_miembros"
                type="number"
                min="1"
                required
                value={formData.limite_miembros}
                onChange={handleInputChange}
                className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center">
              <input
                id="premium"
                type="checkbox"
                checked={formData.premium}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label
                htmlFor="premium"
                className="text-sm font-medium text-gray-700"
              >
                Premium
              </label>
            </div>

            <div>
              <label
                htmlFor="foto"
                className="cursor-pointer inline-block px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition"
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
            </div>

            <button
              type="submit"
              className="w-full bg-gray-800 hover:bg-gray-900 transition text-white font-semibold py-2 rounded-full"
            >
              Crear Equipo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamCreate;
