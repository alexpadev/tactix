import React, { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { Link } from 'react-router-dom';

const Inicio = () => {
  const { token } = useContext(UserContext); 

  return (
    <div className="bg-gray-50 min-h-screen">
      <main>
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto text-center px-6">
            <h2 className="text-7xl font-bold text-gray-800 mb-7">TACTIX</h2>

            <h2 className="text-4xl font-semibold text-gray-800">La herramienta definitiva para equipos deportivos amateurs</h2>
            <p className="mt-4 text-lg text-gray-600">
              Organiza tus entrenamientos, partidos y gestiona a tu equipo de forma eficiente y sencilla.
            </p>
            {!token && (
              <div className="mt-8">
                <Link to="/register" className="inline-block bg-gray-800 text-white px-8 py-5 rounded-full text-lg hover:bg-gray-900 font-bold text-xl transition">
                  Empieza ahora
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#ffc31f] text-white py-16">
          <div className="max-w-7xl mx-auto text-center px-6">
            <h3 className="text-3xl font-bold text-gray-800">¿Por qué TACTIX?</h3>
            <p className="mt-4 font-semibold text-gray-800">Pensado para equipos pequeños o amateurs, como el tuyo.</p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className=" p-6 rounded-lg">
                <h4 className="text-2xl font-bold text-gray-800">Gestión de Equipos</h4>
                <p className="mt-4 font-semibold text-gray-800">Crea y gestiona tus equipos fácilmente, mantén un control de los miembros y sus roles.</p>
              </div>
              <div className=" p-6 rounded-lg">
                <h4 className="text-2xl font-bold text-gray-800">Calendario de Entrenamientos</h4>
                <p className="mt-4 font-semibold text-gray-800">Organiza tus entrenamientos y partidos, mantén a todos informados sobre las fechas clave.</p>
              </div>
              <div className=" p-6 rounded-lg">
                <h4 className="text-2xl font-bold text-gray-800">Chats y Comunicación</h4>
                <p className="mt-4 font-semibold text-gray-800">Mantén a tu equipo conectado con chats en tiempo real para una mejor comunicación.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-7xl mx-auto text-center px-6">
            <h3 className="text-3xl font-semibold text-gray-800">Funcionalidades Premium</h3>
            <p className="mt-4 text-lg text-gray-600">
              Ofrece herramientas avanzadas para los equipos que busquen un nivel de gestión más profesional.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-gray-200 p-6 rounded-lg">
                <h4 className="text-2xl font-semibold">Estadísticas Avanzadas</h4>
                <p className="mt-4">Accede a estadísticas detalladas de tus jugadores y partidos para mejorar el rendimiento del equipo.</p>
              </div>
              <div className="bg-gray-200 p-6 rounded-lg">
                <h4 className="text-2xl font-semibold">Encuestas Personalizadas</h4>
                <p className="mt-4">Crea encuestas personalizadas para mejorar la toma de decisiones y la participación del equipo.</p>
              </div>
              <div className="bg-gray-200 p-6 rounded-lg">
                <h4 className="text-2xl font-semibold">Torneos Privados</h4>
                <p className="mt-4">Organiza torneos privados para tus jugadores, con acceso exclusivo para miembros premium.</p>
              </div>
            </div>
            <div className="mt-8">
              <Link to="/premium" className="inline-block bg-[#ffc31f] text-[#161616] font-bold px-7 py-4 rounded-full text-lg hover:bg-yellow-500 transition">
                Conoce nuestras opciones Premium
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Inicio;
