import React, { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { Link } from 'react-router-dom';


export const Footer = () => {

    const { token } = useContext(UserContext);
    return (
        <div className="mt-20">
          <section className="bg-gray-800 text-white py-13">
          <div className="max-w-7xl mx-auto text-center px-6">
            <h3 className="text-3xl font-semibold">Únete a nosotros hoy</h3>
            <p className="mt-4 text-lg">Regístrate ahora y empieza a gestionar tu equipo de manera más eficiente.</p>
            {!token && (
              <div className="mt-8">
                <Link to="/register" className="inline-block bg-yellow-500 text-gray-800 font-bold px-6 py-3 rounded-full hover:bg-yellow-600 transition">
                  Empieza ahora
                </Link>
              </div>
            )}
          </div>
        </section>

      <footer className="bg-gray-800 text-white py-4">
        <div className="max-w-7xl mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} TACTIX. Todos los derechos reservados.</p>
        </div>
      </footer>
        </div>
      
    )
}