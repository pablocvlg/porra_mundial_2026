'use client';

import { useState, useEffect } from 'react';
import LoginGuard from './LoginGuard';

interface Match {
  id: number;
  matchOrder: number;
  phase: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  penaltyWinner: string | null;
  isFinished: boolean;
}

function AdminMatchesContent() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      setMatches(data);
    } catch (error) {
      console.error('Error loading matches:', error);
      alert('Error al cargar partidos');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleEdit = (match: Match) => {
    setEditingMatch({ ...match });
  };

  const handleSave = async () => {
    if (!editingMatch) return;
    
    // Validación: Si es knockout y hay empate, debe tener penaltyWinner
    if (editingMatch.phase !== 'Group' && 
        editingMatch.homeGoals !== null && 
        editingMatch.awayGoals !== null && 
        editingMatch.homeGoals === editingMatch.awayGoals && 
        !editingMatch.penaltyWinner &&
        editingMatch.isFinished) {
      alert('⚠️ En partidos eliminatorios con empate, debes seleccionar el ganador por penales');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/matches/${editingMatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMatch)
      });

      if (res.ok) {
        const data = await res.json();
        await fetchMatches();
        setEditingMatch(null);
        
        // Mensaje condicional basado en si se recalcularon puntos
        if (data.pointsRecalculated) {
          alert('✓ Partido actualizado y puntos recalculados');
        } else {
          alert('✓ Partido actualizado correctamente');
        }
      } else {
        const error = await res.json();
        alert('Error al actualizar: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el partido');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen bg-black bg-center bg-no-repeat bg-fixed text-white pt-16"
           style={{ backgroundImage: `url('/background.avif')` }}>
        <div className="max-w-7xl mx-auto p-8">
          <div className="text-center text-xl">Cargando partidos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black bg-center bg-no-repeat bg-fixed text-white pt-16"
         style={{ backgroundImage: `url('/background.avif')` }}>
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Administrar Partidos</h1>

        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800/50 rounded-lg p-6 mb-6">
          <div className="text-sm text-gray-400">
            Total de partidos: <span className="text-blue-400 font-semibold">{matches.length}</span>
          </div>
        </div>

        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="bg-gray-900/80 backdrop-blur-md border border-gray-800/50 rounded-lg p-5 shadow-lg hover:border-gray-700/50 transition-colors">
              {editingMatch?.id === match.id ? (
                // MODO EDICIÓN
                <div className="space-y-4">
                  <div className="text-sm text-blue-400 font-semibold mb-2">
                    Partido #{match.matchOrder} - {match.phase} {match.group ? `- Grupo ${match.group}` : ''}
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Equipo Local
                      </label>
                      <input
                        type="text"
                        value={editingMatch.homeTeam || ''}
                        onChange={(e) => setEditingMatch({
                          ...editingMatch,
                          homeTeam: e.target.value
                        })}
                        className="border border-gray-700 bg-gray-800 text-white p-3 w-full rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Nombre del equipo"
                      />
                    </div>

                    <div className="w-24">
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Goles
                      </label>
                      <input
                        type="number"
                        value={editingMatch.homeGoals ?? ''}
                        onChange={(e) => setEditingMatch({
                          ...editingMatch,
                          homeGoals: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="border border-gray-700 bg-gray-800 text-white p-3 w-full text-center rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-xl font-bold"
                        min="0"
                      />
                    </div>

                    <span className="text-3xl font-bold text-gray-500 mt-8">-</span>

                    <div className="w-24">
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Goles
                      </label>
                      <input
                        type="number"
                        value={editingMatch.awayGoals ?? ''}
                        onChange={(e) => setEditingMatch({
                          ...editingMatch,
                          awayGoals: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="border border-gray-700 bg-gray-800 text-white p-3 w-full text-center rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-xl font-bold"
                        min="0"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Equipo Visitante
                      </label>
                      <input
                        type="text"
                        value={editingMatch.awayTeam || ''}
                        onChange={(e) => setEditingMatch({
                          ...editingMatch,
                          awayTeam: e.target.value
                        })}
                        className="border border-gray-700 bg-gray-800 text-white p-3 w-full rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Nombre del equipo"
                      />
                    </div>
                  </div>

                  {match.phase !== 'Group' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Ganador por Penales
                        <span className="text-gray-500 text-xs ml-2">
                          (Requerido si hay empate en tiempo reglamentario + extra)
                        </span>
                      </label>
                      <select
                        value={editingMatch.penaltyWinner || ''}
                        onChange={(e) => setEditingMatch({
                          ...editingMatch,
                          penaltyWinner: e.target.value || null
                        })}
                        className="border border-gray-700 bg-gray-800 text-white p-3 w-full rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="">No hubo penales</option>
                        <option value="home">Local ganó por penales</option>
                        <option value="away">Visitante ganó por penales</option>
                      </select>
                      
                      {editingMatch.homeGoals !== null && 
                       editingMatch.awayGoals !== null && 
                       editingMatch.homeGoals === editingMatch.awayGoals && 
                       !editingMatch.penaltyWinner && (
                        <div className="mt-2 text-sm text-red-400 flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                          <span>⚠️</span>
                          <span>Empate detectado: debes seleccionar el ganador por penales</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 bg-gray-800/50 p-4 rounded-lg">
                    <input
                      type="checkbox"
                      id={`isFinished-${match.id}`}
                      checked={editingMatch.isFinished}
                      onChange={(e) => setEditingMatch({
                        ...editingMatch,
                        isFinished: e.target.checked
                      })}
                      className="w-5 h-5 accent-blue-500"
                    />
                    <label htmlFor={`isFinished-${match.id}`} className="text-sm font-medium">
                      Partido Finalizado (esto recalculará los puntos)
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex-1"
                    >
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button
                      onClick={() => setEditingMatch(null)}
                      disabled={loading}
                      className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // MODO VISTA
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-blue-400 font-semibold mb-2">
                      Partido #{match.matchOrder} - {match.phase} {match.group ? `- Grupo ${match.group}` : ''}
                    </div>
                    <div className="text-xl font-semibold">
                      {match.homeTeam || 'TBD'} 
                      {match.homeGoals !== null && match.awayGoals !== null ? (
                        <span className="mx-3 text-orange-400 font-bold">
                          {match.homeGoals} - {match.awayGoals}
                        </span>
                      ) : (
                        <span className="mx-3 text-gray-500">vs</span>
                      )}
                      {match.awayTeam || 'TBD'}
                    </div>
                    {match.penaltyWinner && (
                      <div className="text-sm text-yellow-400 mt-2 flex items-center gap-1">
                        <span>⚽</span>
                        <span>Ganó por penales: {match.penaltyWinner === 'home' ? match.homeTeam : match.awayTeam}</span>
                      </div>
                    )}
                    <div className="text-sm mt-2">
                      {match.isFinished ? (
                        <span className="text-green-400 font-medium flex items-center gap-1">
                          <span>✓</span> Finalizado
                        </span>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1">
                          <span>⏳</span> Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(match)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminMatchesPage() {
  return (
    <LoginGuard>
      <AdminMatchesContent />
    </LoginGuard>
  );
}