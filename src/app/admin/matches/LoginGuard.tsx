'use client';

import { useState, useEffect } from 'react';

interface LoginGuardProps {
  children: React.ReactNode;
}

export default function LoginGuard({ children }: LoginGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si ya está autenticado
    const auth = sessionStorage.getItem('admin_authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        sessionStorage.setItem('admin_authenticated', 'true');
        setIsAuthenticated(true);
      } else {
        setError('Contraseña incorrecta');
        setPassword('');
      }
    } catch (err) {
      setError('Error al autenticar');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-black bg-center bg-no-repeat bg-fixed text-white flex items-center justify-center"
           style={{ backgroundImage: `url('/background.avif')` }}>
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-black bg-center bg-no-repeat bg-fixed text-white flex items-center justify-center"
           style={{ backgroundImage: `url('/background.avif')` }}>
        <div className="bg-gray-900/90 backdrop-blur-md border border-gray-800/50 rounded-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold mb-6 text-center">Panel de Administración</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-700 bg-gray-800 text-white p-3 w-full rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Introduce la contraseña"
                autoFocus
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold transition-colors w-full"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Cerrar Sesión
        </button>
      </div>
      {children}
    </>
  );
}