"use client";

import { useState, useEffect } from "react";

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
  const [porraOptions, setPorraOptions] = useState<string[]>([]);
  const [porraData, setPorraData] = useState<PorraStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/porras")
      .then(res => res.json())
      .then((data: { name: string }[]) => {
        setPorraOptions(data.map(p => p.name));
      });
  }, []);

  const handleSearch = async (name: string) => {
    if (!name) {
      setPorraData(null);
      return;
    }

    setLoading(true);
    setError("");
    setPorraData(null);
    setSelectedParticipantId(null);
    setExpandedRowId(null);

    try {
      const params = new URLSearchParams({ porraName: name });
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

  const handleSelectChange = (name: string) => {
    setPorraName(name);
    handleSearch(name);
  };

  const handleReset = () => {
    setPorraData(null);
    setPorraName("");
    setSelectedParticipantId(null);
    setExpandedRowId(null);
    setError("");
  };

  const handleRowClick = (entryId: number) => {
    setExpandedRowId(expandedRowId === entryId ? null : entryId);
  };

  const translatePhase = (phase: string): string => {
    const map: Record<string, string> = {
      "Group":         "Fase de grupos",
      "Round of 32":   "Dieciseisavos de final",
      "Round of 16":   "Octavos de final",
      "Quarter-final": "Cuartos de final",
      "Semi-final":    "Semifinales",
      "Final":         "Final",
      "Third Place":   "3er y 4º puesto",
    };
    return map[phase] ?? phase;
  };

  const groupPredictionsByPhase = (predictions: Prediction[]) => {
    const grouped: Record<string, Prediction[]> = {};
    const sortedPredictions = [...predictions].sort((a, b) => a.match.id - b.match.id);
    sortedPredictions.forEach(pred => {
      const phase = pred.match.phase;
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(pred);
    });
    return grouped;
  };

  const calculateStats = (entry: Entry) => {
    let exactMatches = 0;
    let correctWinner = 0;
    let exactMatchPoints = 0;
    let qualifiedTeams = 0;
    let qualifiedWithPosition = 0;

    entry.predictions.forEach(pred => {
      const match = pred.match;
      if (!match.isFinished || match.homeGoals === null || match.awayGoals === null) return;

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
        if (predWinner === matchWinner) correctWinner++;
      }
    });

    const groupPredictions = entry.predictions.filter(p => p.match.phase === 'Group');
    const groupsByLetter: Record<string, typeof groupPredictions> = {};
    groupPredictions.forEach(pred => {
      const groupLetter = pred.match.group;
      if (groupLetter) {
        if (!groupsByLetter[groupLetter]) groupsByLetter[groupLetter] = [];
        groupsByLetter[groupLetter].push(pred);
      }
    });

    for (const [, groupPreds] of Object.entries(groupsByLetter)) {
      const groupFinished = groupPreds.every(p =>
        p.match.isFinished && p.match.homeGoals !== null && p.match.awayGoals !== null
      );
      if (!groupFinished) continue;

      const predictedStandings = calculateGroupStandings(groupPreds, true);
      const realStandings = calculateGroupStandings(groupPreds, false);

      for (let position = 0; position < 2; position++) {
        const predictedTeam = predictedStandings[position]?.team;
        const realTeam = realStandings[position]?.team;
        if (!predictedTeam || !realTeam) continue;

        if (predictedTeam === realTeam) {
          qualifiedWithPosition++;
        } else {
          const realTop2 = realStandings.slice(0, 2).map(s => s.team);
          if (realTop2.includes(predictedTeam)) qualifiedTeams++;
        }
      }
    }

    const qualificationPoints = (qualifiedTeams * 5) + (qualifiedWithPosition * 3);
    return { exactMatches, correctWinner, exactMatchPoints, qualifiedTeams, qualifiedWithPosition, qualificationPoints };
  };

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
        if (!stats[team]) stats[team] = { team, points: 0, gd: 0, gf: 0, ga: 0 };
      });

      const homeGoals = usePrediction ? pred.homeGoals : (pred.match.homeGoals ?? 0);
      const awayGoals = usePrediction ? pred.awayGoals : (pred.match.awayGoals ?? 0);

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

    Object.values(stats).forEach(team => { team.gd = team.gf - team.ga; });

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  };

  const selectedEntry = porraData?.allEntries.find(e => e.id === selectedParticipantId);

  return (
    <div className="min-h-screen bg-black bg-no-repeat bg-center text-white pt-14"
      style={{ backgroundImage: `url('/background.avif')` }}>
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">Clasificación</h1>

        {/* Selector de porra */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-lg p-4 mb-4">
          <div className="flex flex-col items-center">
            <label className="block font-semibold mb-1 text-sm w-4/5 md:w-1/3">Nombre de la porra:</label>
            <select
              className="border border-gray-700 bg-gray-800 text-white p-2 w-4/5 md:w-1/3 rounded text-sm focus:outline-none focus:border-blue-500"
              value={porraName}
              onChange={e => handleSelectChange(e.target.value)}
            >
              <option value="">-- Selecciona una porra --</option>
              {porraOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mt-3 bg-red-900/50 border border-red-700 text-red-200 p-2 rounded text-sm text-center">
              {error}
            </div>
          )}

          {loading && (
            <p className="text-center text-gray-400 text-sm mt-3">Cargando...</p>
          )}
        </div>

        {/* Resultados */}
        {porraData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Clasificación */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-lg shadow-md p-4 border border-gray-800/50">
              <p className="text-xs text-gray-400 mb-3">💡 Haz clic en un participante para ver detalles.</p>
              <h2 className="text-lg font-bold mb-3 text-center">{porraData.porra.name}</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="p-2 text-left w-12">Pos</th>
                      <th className="p-2 text-left">Participante</th>
                      <th className="p-2 text-center w-20">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porraData.allEntries.map((entry, index) => {
                      const stats = calculateStats(entry);
                      const isExpanded = expandedRowId === entry.id;

                      return (
                        <>
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
                            <td className="p-2 font-semibold">
                              {index === 0 && "🥇"}
                              {index === 1 && "🥈"}
                              {index === 2 && "🥉"}
                              {index > 2 && (index + 1)}
                            </td>
                            <td className="p-2 font-medium">{entry.participantName}</td>
                            <td className="p-2 text-center font-bold text-lg text-orange-400">
                              {entry.totalPoints}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-gray-800/50">
                              <td colSpan={3} className="p-3">
                                <div className="space-y-2 text-xs">
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1 uppercase tracking-wide">Grupos</h4>
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                        <span className="text-gray-300">Clasificados + posición:</span>
                                        <span className="font-semibold text-purple-400 pr-4">
                                          <span className="text-purple-300">(+{stats.qualifiedWithPosition * 8}pt.)</span> {stats.qualifiedWithPosition}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                        <span className="text-gray-300">Solo clasificados:</span>
                                        <span className="font-semibold text-indigo-400 pr-4">
                                          <span className="text-indigo-300">(+{stats.qualifiedTeams * 5}pt.)</span> {stats.qualifiedTeams}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1 uppercase tracking-wide">Partidos</h4>
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                        <span className="text-gray-300">Ganadores:</span>
                                        <span className="font-semibold text-blue-400 pr-4">
                                          <span className="text-blue-300">(+{stats.correctWinner * 3}pt.)</span> {stats.correctWinner}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                                        <span className="text-gray-300">Resultados exactos:</span>
                                        <span className="font-semibold text-green-400 pr-4">
                                          <span className="text-green-300">(+{stats.exactMatchPoints}pt.)</span> {stats.exactMatches}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-400 mb-1 uppercase tracking-wide">Eliminatorias</h4>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedParticipantId(entry.id);
                                    }}
                                    className="w-full mt-1 bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700 transition-colors text-xs"
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
                <p className="text-gray-400 text-center py-4 text-sm">Aún no hay participantes en esta porra</p>
              )}
            </div>

            {/* Predicciones */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-lg shadow-md p-4 border border-gray-800/50">
              <div className="mb-3">
                <label className="block font-semibold mb-2 text-sm">Ver predicciones de partidos de:</label>
                <select
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded text-sm focus:outline-none focus:border-blue-500"
                  value={selectedParticipantId || ""}
                  onChange={e => setSelectedParticipantId(Number(e.target.value))}
                >
                  <option value="">-- Selecciona un participante --</option>
                  {porraData.allEntries.map(entry => (
                    <option key={entry.id} value={entry.id}>{entry.participantName}</option>
                  ))}
                </select>
              </div>

              {selectedEntry && (
                <>
                  <div className="mb-3 p-3 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg border border-blue-700/50 text-sm">
                    <p className="text-gray-300">
                      Puntos totales: <span className="font-bold text-orange-400 text-base ml-1">{selectedEntry.totalPoints}</span>
                    </p>
                    <p className="text-gray-300 mt-1">
                      Pichichi: <span className="font-semibold ml-1">{selectedEntry.pichichi}</span>
                    </p>
                  </div>

                  <div className="max-h-[600px] overflow-y-auto">
                    {Object.entries(groupPredictionsByPhase(selectedEntry.predictions)).map(([phase, preds]) => (
                      <div key={phase} className="mb-4">
                        <h3 className="text-sm font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-1 sticky top-0 bg-gray-900/95 backdrop-blur-sm">
                          {translatePhase(phase)}
                        </h3>
                        <div className="space-y-1">
                          {preds.map(pred => {
                            const match = pred.match;
                            const isFinished = match.isFinished && match.homeGoals !== null && match.awayGoals !== null;
                            let isExact = false;
                            let isCorrectWinner = false;
                            let isFailed = false;

                            if (isFinished) {
                              isExact = pred.homeGoals === match.homeGoals && pred.awayGoals === match.awayGoals;
                              const predWinner = pred.homeGoals > pred.awayGoals ? 'home' :
                                pred.awayGoals > pred.homeGoals ? 'away' : 'draw';
                              const matchWinner = match.homeGoals! > match.awayGoals! ? 'home' :
                                match.awayGoals! > match.homeGoals! ? 'away' : 'draw';
                              if (!isExact && predWinner === matchWinner) isCorrectWinner = true;
                              if (!isExact && !isCorrectWinner) isFailed = true;
                            }

                            return (
                              <div
                                key={pred.id}
                                className={`flex items-center justify-between p-2 rounded text-xs transition ${
                                  isExact ? 'bg-blue-900/30 border border-blue-700' :
                                  isCorrectWinner ? 'bg-green-900/30 border border-green-700' :
                                  isFailed ? 'bg-red-900/20 border border-red-900/50' :
                                  'bg-gray-800 border border-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-2 flex-1">
                                  <span className="w-2/5 text-right">{pred.match.homeTeam}</span>
                                  <div className="flex items-center space-x-1 font-bold bg-gray-900 px-2 py-0.5 rounded">
                                    <span className="w-5 text-center">{pred.homeGoals}</span>
                                    <span className="text-gray-500">-</span>
                                    <span className="w-5 text-center">{pred.awayGoals}</span>
                                  </div>
                                  <span className="w-2/5">{pred.match.awayTeam}</span>
                                </div>

                                {isFinished && (
                                  <div className="ml-2 flex items-center gap-1">
                                    <div className="text-xs bg-gray-800 border border-gray-600 px-1.5 py-0.5 rounded">
                                      <span className="text-gray-300 font-semibold">{match.homeGoals}-{match.awayGoals}</span>
                                    </div>
                                    {isExact && <span className="text-blue-400 font-bold">🏆</span>}
                                    {isCorrectWinner && <span className="text-green-400 font-bold">✓</span>}
                                    {isFailed && <span className="text-red-400 font-bold">✗</span>}
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
                <p className="text-gray-400 text-center py-8 text-sm">
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