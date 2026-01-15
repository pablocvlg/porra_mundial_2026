"use client";

import { useState } from "react";

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  phase: string;
  group?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  isFinished: boolean;
};

type Prediction = {
  id: number;
  matchId: number;
  homeGoals: number;
  awayGoals: number;
  match: Match;
};

type Entry = {
  id: number;
  participantName: string;
  porraId: number;
  pichichi: string;
  createdAt: string;
  totalPoints: number;
  predictions: Prediction[];
};

type PorraStatusResponse = {
  porra: {
    id: number;
    name: string;
  };
  allEntries: Entry[];
};

export default function PorraStatusPage() {
  const [porraName, setPorraName] = useState("");
  const [porraData, setPorraData] = useState<PorraStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!porraName) {
      setError("Debes introducir el nombre de la porra");
      return;
    }

    setLoading(true);
    setError("");
    setPorraData(null);
    setSelectedParticipantId(null);
    setExpandedRowId(null);

    try {
      const params = new URLSearchParams({
        porraName,
      });

      const res = await fetch(`/api/porra-status?${params}`);
      const data = await res.json();

      if (res.ok) {
        setPorraData(data);
      } else {
        setError(data.error || "Error al cargar la porra");
      }
    } catch (err) {
      console.error(err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPorraData(null);
    setPorraName("");
    setSelectedParticipantId(null);
    setExpandedRowId(null);
    setError("");
  };

  const handleRowClick = (entryId: number) => {
    // Toggle: si ya está expandido, colapsar; si no, expandir
    setExpandedRowId(expandedRowId === entryId ? null : entryId);
  };

  const groupPredictionsByPhase = (predictions: Prediction[]) => {
    const grouped: Record<string, Prediction[]> = {};
    
    // Primero ordenar todas las predicciones por id
    const sortedPredictions = [...predictions].sort((a, b) => 
      a.match.id - b.match.id
    );
    
    sortedPredictions.forEach(pred => {
      const phase = pred.match.phase;
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(pred);
    });
    
    return grouped;
  };

  // Calcular estadísticas de un participante
  const calculateStats = (entry: Entry) => {
    let exactMatches = 0;
    let correctWinner = 0;
    let exactMatchPoints = 0;
    let qualifiedTeams = 0;
    let qualifiedWithPosition = 0;

    // Calcular puntos de partidos individuales
    entry.predictions.forEach(pred => {
      const match = pred.match;
      
      if (!match.isFinished || match.homeGoals === null || match.awayGoals === null) {
        return;
      }

      const homeGoals = match.homeGoals as number;
      const awayGoals = match.awayGoals as number;

      if (pred.homeGoals === homeGoals && pred.awayGoals === awayGoals) {
        exactMatches++;
        correctWinner++;
        const totalGoals = homeGoals + awayGoals;
        const points = totalGoals <= 1 ? 1 : totalGoals;
        exactMatchPoints += points;
      } else {
        const predWinner = pred.homeGoals > pred.awayGoals ? 'home' : 
                          pred.awayGoals > pred.homeGoals ? 'away' : 'draw';
        const matchWinner = homeGoals > awayGoals ? 'home' : 
                          awayGoals > homeGoals ? 'away' : 'draw';
        
        if (predWinner === matchWinner) {
          correctWinner++;
        }
      }
    });

    // Calcular puntos de clasificación (1º y 2º) - grupo por grupo
    const groupPredictions = entry.predictions.filter(p => p.match.phase === 'Group');
    
    // Agrupar por letra de grupo
    const groupsByLetter: Record<string, typeof groupPredictions> = {};
    
    groupPredictions.forEach(pred => {
      const groupLetter = pred.match.group;
      if (groupLetter) {
        if (!groupsByLetter[groupLetter]) {
          groupsByLetter[groupLetter] = [];
        }
        groupsByLetter[groupLetter].push(pred);
      }
    });

    // Para cada grupo individual que esté completo
    for (const [groupLetter, groupPreds] of Object.entries(groupsByLetter)) {
      // Verificar si ESTE grupo específico está completo
      const groupFinished = groupPreds.every(p => 
        p.match.isFinished && p.match.homeGoals !== null && p.match.awayGoals !== null
      );
      
      if (!groupFinished) {
        continue;
      }

      const predictedStandings = calculateGroupStandings(groupPreds, true);
      const realStandings = calculateGroupStandings(groupPreds, false);

      console.log(`\n=== GRUPO ${groupLetter} ===`);
      console.log('Clasificación predicha:', predictedStandings.slice(0, 2));
      console.log('Clasificación real:', realStandings.slice(0, 2));

      // Comparar solo posiciones 1º y 2º (siempre clasifican)
      for (let position = 0; position < 2; position++) {
        const predictedTeam = predictedStandings[position]?.team;
        const realTeam = realStandings[position]?.team;

        console.log(`\nPosición ${position + 1}:`);
        console.log('  Predicho:', predictedTeam);
        console.log('  Real:', realTeam);

        if (!predictedTeam || !realTeam) continue;

        // Si acerté la posición exacta
        if (predictedTeam === realTeam) {
          console.log('  ✅ ACERTÓ POSICIÓN EXACTA');
          qualifiedWithPosition++;
        } else {
          // Si no acerté la posición, verificar si el equipo clasificó de todos modos
          const realTop2 = realStandings.slice(0, 2).map(s => s.team);
          console.log('  Top 2 real:', realTop2);
          if (realTop2.includes(predictedTeam)) {
            console.log('  ✅ CLASIFICÓ (pero en otra posición)');
            qualifiedTeams++;
          } else {
            console.log('  ❌ NO CLASIFICÓ');
          }
        }
      }
    }

    console.log('\n=== TOTALES ===');
    console.log('qualifiedWithPosition:', qualifiedWithPosition);
    console.log('qualifiedTeams:', qualifiedTeams);

    const qualificationPoints = (qualifiedTeams * 5) + (qualifiedWithPosition * 3);

    return { 
      exactMatches, 
      correctWinner, 
      exactMatchPoints,
      qualifiedTeams,
      qualifiedWithPosition,
      qualificationPoints
    };
  };

  // Función auxiliar para calcular standings de un grupo
  const calculateGroupStandings = (
    groupPredictions: Prediction[],
    usePrediction: boolean
  ): Array<{ team: string; points: number; gd: number; gf: number }> => {
    const stats: Record<string, { team: string; points: number; gd: number; gf: number; ga: number }> = {};

    groupPredictions.forEach(pred => {
      const homeTeam = pred.match.homeTeam;
      const awayTeam = pred.match.awayTeam;

      if (!homeTeam || !awayTeam) return;

      [homeTeam, awayTeam].forEach(team => {
        if (!stats[team]) {
          stats[team] = { team, points: 0, gd: 0, gf: 0, ga: 0 };
        }
      });

      const homeGoals = usePrediction 
        ? pred.homeGoals 
        : (pred.match.homeGoals ?? 0);
      const awayGoals = usePrediction 
        ? pred.awayGoals 
        : (pred.match.awayGoals ?? 0);

      stats[homeTeam].gf += homeGoals;
      stats[homeTeam].ga += awayGoals;
      stats[awayTeam].gf += awayGoals;
      stats[awayTeam].ga += homeGoals;

      if (homeGoals > awayGoals) {
        stats[homeTeam].points += 3;
      } else if (homeGoals < awayGoals) {
        stats[awayTeam].points += 3;
      } else {
        stats[homeTeam].points += 1;
        stats[awayTeam].points += 1;
      }
    });

    Object.values(stats).forEach(team => {
      team.gd = team.gf - team.ga;
    });

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  };

  const selectedEntry = porraData?.allEntries.find(e => e.id === selectedParticipantId);

  return (
    <div className="min-h-screen bg-black bg-no-repeat bg-center text-white pt-16"
         style={{ backgroundImage: `url('/background.avif')` }}>
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Estado de la Porra</h1>

        {/* Buscador o Botón de Reset */}
        {!porraData ? (
          <div className="bg-gray-900/80 backdrop-blur-md rounded-lg shadow-md p-6 mb-6 border border-gray-800/50">
            <h2 className="text-xl font-semibold mb-4">Buscar Porra</h2>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block font-semibold mb-2">Nombre de la porra:</label>
                <input
                  type="text"
                  className="border border-gray-700 bg-gray-800 text-white p-3 w-full rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Introduce el nombre"
                  value={porraName}
                  onChange={e => setPorraName(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div className="flex items-end">
                <button
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 font-semibold transition-colors"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <button
              className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-700 border border-gray-700 transition-colors"
              onClick={handleReset}
            >
              ← Buscar otra porra
            </button>
          </div>
        )}

        {/* Resultados */}
        {porraData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clasificación */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-lg shadow-md p-6 border border-gray-800/50">
              <div className="mb-5 text-sm">
                <p className="font-semibold">💡 Haz clic en un participante para ver detalles.</p>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-center">
                {porraData.porra.name}
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="p-3 text-left w-16">Pos</th>
                      <th className="p-3 text-left">Participante</th>
                      <th className="p-3 text-center w-24">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porraData.allEntries.map((entry, index) => {
                      const stats = calculateStats(entry);
                      const isExpanded = expandedRowId === entry.id;
                      
                      return (
                        <>
                          {/* Fila principal */}
                          <tr 
                            key={entry.id} 
                            className={`border-b border-gray-800 cursor-pointer transition ${
                              selectedParticipantId === entry.id 
                                ? "bg-gray-700 ring-2 ring-blue-500" 
                                : isExpanded
                                ? "bg-gray-700"
                                : "hover:bg-gray-800"
                            }`}
                            onClick={() => handleRowClick(entry.id)}
                          >
                            <td className="p-3 font-semibold text-lg">
                              {index === 0 && "🥇"}
                              {index === 1 && "🥈"}
                              {index === 2 && "🥉"}
                              {index > 2 && (index + 1)}
                            </td>
                            <td className="p-3 font-medium">
                              {entry.participantName}
                            </td>
                            <td className="p-3 text-center font-bold text-xl text-orange-400">
                              {entry.totalPoints}
                            </td>
                          </tr>

                          {/* Fila expandida con detalles */}
                          {isExpanded && (
                            <tr className="bg-gray-800/50">
                              <td colSpan={3} className="p-4">
                                <div className="space-y-3 text-sm">
                                  {/* Sección PARTIDOS */}
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-2 text-xs uppercase tracking-wide">
                                      Partidos
                                    </h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                        <span className="text-gray-300">Ganadores:</span>
                                        <span className="font-semibold text-blue-400 text-base pr-5">
                                          <span className="text-blue-300 text-sm">(+{stats.correctWinner * 3}pt.)</span> {stats.correctWinner}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                        <span className="text-gray-300">Resultados exactos:</span>
                                        <span className="font-semibold text-green-400 text-base pr-5">
                                          <span className="text-green-300 text-sm">(+{stats.exactMatchPoints}pt.)</span> {stats.exactMatches}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sección EQUIPOS */}
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-2 text-xs uppercase tracking-wide">
                                      Equipos
                                    </h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                        <span className="text-gray-300">Clasificados + posición:</span>
                                        <span className="font-semibold text-purple-400 text-base pr-5">
                                          <span className="text-purple-300 text-sm">(+{stats.qualifiedWithPosition * 8}pt.)</span> {stats.qualifiedWithPosition}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                        <span className="text-gray-300">Solo clasificados:</span>
                                        <span className="font-semibold text-indigo-400 text-base pr-5">
                                          <span className="text-indigo-300 text-sm">(+{stats.qualifiedTeams * 5}pt.)</span> {stats.qualifiedTeams}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Botón */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedParticipantId(entry.id);
                                    }}
                                    className="w-full mt-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Ver todas las predicciones →
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {porraData.allEntries.length === 0 && (
                <p className="text-gray-400 text-center py-4">
                  Aún no hay participantes en esta porra
                </p>
              )}
            </div>

            {/* Predicciones */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-lg shadow-md p-6 border border-gray-800/50">
              <div className="mb-4">
                <label className="block font-semibold mb-3">Ver predicciones de partidos de:</label>
                <select
                  className="border border-gray-700 bg-gray-800 text-white p-3 w-full rounded-lg focus:outline-none focus:border-blue-500"
                  value={selectedParticipantId || ""}
                  onChange={e => setSelectedParticipantId(Number(e.target.value))}
                >
                  <option value="">-- Selecciona un participante --</option>
                  {porraData.allEntries.map(entry => (
                    <option key={entry.id} value={entry.id}>
                      {entry.participantName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEntry && (
                <>
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg border border-blue-700/50">
                    <p className="text-semibold text-gray-300">
                      Puntos totales: <span className="font-bold text-orange-400 text-lg ml-1">{selectedEntry.totalPoints}</span>
                    </p>
                    <p className="text-semibold text-gray-300 mt-1">
                      Pichichi: <span className="font-semibold text-gray-300 ml-1">{selectedEntry.pichichi}</span>
                    </p>
                  </div>

                  <div className="max-h-[600px] overflow-y-auto">
                    {Object.entries(groupPredictionsByPhase(selectedEntry.predictions)).map(([phase, preds]) => (
                      <div key={phase} className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 text-blue-400 border-b border-gray-700 pb-2 sticky top-0 bg-gray-900/95 backdrop-blur-sm">
                          {phase}
                        </h3>
                        
                        <div className="space-y-2">
                          {preds.map(pred => {
                            const match = pred.match;
                            const isFinished = match.isFinished && match.homeGoals !== null && match.awayGoals !== null;
                            
                            // Calcular si acertó
                            let isExact = false;
                            let isCorrectWinner = false;
                            let isFailed = false;
                            
                            if (isFinished) {
                              isExact = pred.homeGoals === match.homeGoals && pred.awayGoals === match.awayGoals;
                              
                              const predWinner = pred.homeGoals > pred.awayGoals ? 'home' : 
                                                pred.awayGoals > pred.homeGoals ? 'away' : 'draw';
                              const matchWinner = match.homeGoals! > match.awayGoals! ? 'home' : 
                                                 match.awayGoals! > match.homeGoals! ? 'away' : 'draw';
                              
                              if (!isExact && predWinner === matchWinner) {
                                isCorrectWinner = true;
                              }
                              
                              if (!isExact && !isCorrectWinner) {
                                isFailed = true;
                              }
                            }
                            
                            return (
                              <div 
                                key={pred.id} 
                                className={`flex items-center justify-between p-3 rounded transition ${
                                  isExact ? 'bg-blue-900/30 border border-blue-700' :
                                  isCorrectWinner ? 'bg-green-900/30 border border-green-700' :
                                  isFailed ? 'bg-red-900/20 border border-red-900/50' :
                                  'bg-gray-800 border border-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-4 flex-1">
                                  <span className="w-2/5 text-right text-sm">{pred.match.homeTeam}</span>
                                  <div className="flex items-center space-x-2 font-bold text-lg bg-gray-900 px-3 py-1 rounded shadow-sm">
                                    <span className="w-6 text-center">{pred.homeGoals}</span>
                                    <span className="text-gray-500">-</span>
                                    <span className="w-6 text-center">{pred.awayGoals}</span>
                                  </div>
                                  <span className="w-2/5 text-sm">{pred.match.awayTeam}</span>
                                </div>
                                
                                {isFinished && (
                                  <div className="ml-4 flex items-center gap-2">
                                    <div className="text-sm bg-gray-800 border border-gray-600 px-2 py-1 rounded">
                                      <span className="text-gray-300 font-semibold">
                                        {match.homeGoals}-{match.awayGoals}
                                      </span>
                                    </div>
                                    {isExact && (
                                      <span className="text-blue-400 font-bold text-xs flex items-center gap-1">
                                        🏆 RESULTADO
                                      </span>
                                    )}
                                    {isCorrectWinner && (
                                      <span className="text-green-400 font-bold text-xs">✓ GANADOR</span>
                                    )}
                                    {isFailed && (
                                      <span className="text-red-400 font-bold text-xs">✗</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!selectedEntry && porraData.allEntries.length > 0 && (
                <p className="text-gray-400 text-center py-8">
                  Selecciona un participante para ver sus predicciones.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}