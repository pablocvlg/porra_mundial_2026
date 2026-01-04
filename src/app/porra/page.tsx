"use client";

import { useState, useEffect, useMemo } from "react";

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  phase: string;
  group?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

type TeamStats = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type PredictionValue = number | "";

export default function PorraPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [porraName, setPorraName] = useState("");
  const [pichichi, setPichichi] = useState("");
  const [predictions, setPredictions] = useState<Record<number, { homeGoals: PredictionValue; awayGoals: PredictionValue }>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"error" | "success">("error");

  useEffect(() => {
    fetch("/api/matches")
      .then(res => res.json())
      .then((data: Match[]) => {
        setMatches(data);
        const initialPredictions: Record<number, { homeGoals: number; awayGoals: number }> = {};
        data.forEach(match => {
          initialPredictions[match.id] = { homeGoals: 0, awayGoals: 0 };
        });
        setPredictions(initialPredictions);
      });
  }, []);

  // Calcular todas las clasificaciones de grupos y resolver brackets en un solo useMemo
  const groupedMatches = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    const groupStandings: Record<string, TeamStats[]> = {};
    const knockout: Match[] = [];

    // Función interna para calcular standings
    const calculateGroupStandings = (groupMatches: Match[]): TeamStats[] => {
      const statsMap: Record<string, TeamStats> = {};

      groupMatches.forEach(match => {
        const pred = predictions[match.id];
        if (!pred) return;

        [match.homeTeam, match.awayTeam].forEach(team => {
          if (!statsMap[team]) {
            statsMap[team] = {
              team,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              goalDifference: 0,
              points: 0,
            };
          }
        });

        const homeGoals = typeof pred.homeGoals === "number" ? pred.homeGoals : 0;
        const awayGoals = typeof pred.awayGoals === "number" ? pred.awayGoals : 0;

        statsMap[match.homeTeam].played++;
        statsMap[match.awayTeam].played++;
        statsMap[match.homeTeam].goalsFor += homeGoals;
        statsMap[match.homeTeam].goalsAgainst += awayGoals;
        statsMap[match.awayTeam].goalsFor += awayGoals;
        statsMap[match.awayTeam].goalsAgainst += homeGoals;

        if (homeGoals > awayGoals) {
          statsMap[match.homeTeam].won++;
          statsMap[match.homeTeam].points += 3;
          statsMap[match.awayTeam].lost++;
        } else if (homeGoals < awayGoals) {
          statsMap[match.awayTeam].won++;
          statsMap[match.awayTeam].points += 3;
          statsMap[match.homeTeam].lost++;
        } else {
          statsMap[match.homeTeam].drawn++;
          statsMap[match.awayTeam].drawn++;
          statsMap[match.homeTeam].points += 1;
          statsMap[match.awayTeam].points += 1;
        }
      });

      Object.values(statsMap).forEach(stats => {
        stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
      });

      return Object.values(statsMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
    };

    // Primero agrupar partidos de fase de grupos
    matches.forEach(match => {
      if (match.phase === "Group" && match.group) {
        const groupLetter = match.group.replace('Group ', '');
        if (!groups[groupLetter]) groups[groupLetter] = [];
        groups[groupLetter].push(match);
      }
    });

    // Calcular standings de cada grupo
    Object.keys(groups).forEach(groupKey => {
      groupStandings[groupKey] = calculateGroupStandings(groups[groupKey]);
    });

    // Función para resolver nombres de equipos
    const resolveTeamName = (placeholder: string): string => {
      // Patrón: "1º Grupo A", "2º Grupo B"
      const singleGroupPattern = /^([1-3])º Grupo ([A-L])$/i;
      const singleMatch = placeholder.match(singleGroupPattern);
      
      if (singleMatch) {
        const position = parseInt(singleMatch[1]) - 1;
        const groupLetter = singleMatch[2].toUpperCase();
        
        const standings = groupStandings[groupLetter];
        if (standings && standings[position]) {
          return standings[position].team;
        }
      }

      // Patrón: "2º L" (sin palabra "Grupo")
      const shortPattern = /^([1-3])º\s+([A-L])$/i;
      const shortMatch = placeholder.match(shortPattern);
      
      if (shortMatch) {
        const position = parseInt(shortMatch[1]) - 1;
        const groupLetter = shortMatch[2].toUpperCase();
        
        const standings = groupStandings[groupLetter];
        if (standings && standings[position]) {
          return standings[position].team;
        }
      }

      return placeholder;
    };

    // Procesar partidos eliminatorios
    matches.forEach(match => {
      if (match.phase !== "Group") {
        if (match.phase === "Round of 32") {
          knockout.push({
            ...match,
            homeTeam: resolveTeamName(match.homeTeam),
            awayTeam: resolveTeamName(match.awayTeam),
          });
        } else {
          knockout.push(match);
        }
      }
    });

    return { groups, knockout, groupStandings };
  }, [matches, predictions]);

  const handlePredictionChange = (matchId: number, field: "homeGoals" | "awayGoals", value: string) => {
    if (value === "") {
      setPredictions(prev => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          [field]: "",
        },
      }));
      return;
    }

    if (!/^\d+$/.test(value)) return;

    const numValue = parseInt(value, 10);
    const limitedValue = Math.max(0, Math.min(20, numValue));
    
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: limitedValue,
      },
    }));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleBlur = (matchId: number, field: "homeGoals" | "awayGoals") => {
    const currentValue = predictions[matchId]?.[field];
    if (currentValue === "" || currentValue === undefined) {
      setPredictions(prev => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          [field]: 0,
        },
      }));
    }
  };

  const resetForm = () => {
    setParticipantName("");
    setPorraName("");
    setPichichi("");
    const initialPredictions: Record<number, { homeGoals: PredictionValue; awayGoals: PredictionValue }> = {};
    matches.forEach(match => {
      initialPredictions[match.id] = { homeGoals: 0, awayGoals: 0 };
    });
    setPredictions(initialPredictions);
  };

  const closeModal = () => {
    setShowModal(false);
    if (modalType === "success") {
      resetForm();
    }
  };

  const handleSubmit = async () => {
    if (!participantName || !porraName || !pichichi) {
      setModalMessage("Debes introducir tu nombre, el nombre de la porra y tu pichichi");
      setModalType("error");
      setShowModal(true);
      return;
    }

    for (const match of matches) {
      const pred = predictions[match.id];
      if (!pred || pred.homeGoals === "" || pred.homeGoals === undefined || pred.awayGoals === "" || pred.awayGoals === undefined) {
        setModalMessage("Debes rellenar todos los partidos");
        setModalType("error");
        setShowModal(true);
        return;
      }
    }

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName,
          porraName,
          pichichi,
          predictions: matches.map(match => ({
            matchId: match.id,
            homeGoals: typeof predictions[match.id].homeGoals === "number" ? predictions[match.id].homeGoals : 0,
            awayGoals: typeof predictions[match.id].awayGoals === "number" ? predictions[match.id].awayGoals : 0,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setModalMessage("¡Porra enviada correctamente!");
        setModalType("success");
        setShowModal(true);
      } else {
        setModalMessage(data.error || "Error al enviar la porra");
        setModalType("error");
        setShowModal(true);
      }
    } catch (err) {
      console.error(err);
      setModalMessage("Error al enviar la porra");
      setModalType("error");
      setShowModal(true);
    }
  };

  const renderMatch = (match: Match) => (
    <div key={match.id} className="bg-gray-800 border border-gray-700 rounded">
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <span className="text-sm flex-1">{match.homeTeam}</span>
        <input
          type="text"
          inputMode="numeric"
          className="border border-gray-600 bg-gray-900 text-white p-1 w-10 text-center rounded text-sm"
          value={predictions[match.id]?.homeGoals ?? 0}
          onFocus={handleFocus}
          onBlur={() => handleBlur(match.id, "homeGoals")}
          onChange={e => handlePredictionChange(match.id, "homeGoals", e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between p-2">
        <span className="text-sm flex-1">{match.awayTeam}</span>
        <input
          type="text"
          inputMode="numeric"
          className="border border-gray-600 bg-gray-900 text-white p-1 w-10 text-center rounded text-sm"
          value={predictions[match.id]?.awayGoals ?? 0}
          onFocus={handleFocus}
          onBlur={() => handleBlur(match.id, "awayGoals")}
          onChange={e => handlePredictionChange(match.id, "awayGoals", e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-8xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Formulario de Porra Mundial 2026</h1>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">Nombre del participante:</label>
                <input
                  type="text"
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Juan Pérez"
                  value={participantName}
                  onChange={e => setParticipantName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nombre de la porra:</label>
                <input
                  type="text"
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Porra Oficina 2026"
                  value={porraName}
                  onChange={e => setPorraName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Pichichi:</label>
                <input
                  type="text"
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Kylian Mbappé"
                  value={pichichi}
                  onChange={e => setPichichi(e.target.value)}
                />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4">Fase de Grupos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {Object.entries(groupedMatches.groups).sort().map(([groupLetter, groupMatches]) => {
              const standings = groupedMatches.groupStandings[groupLetter] || [];
              
              return (
                <div key={groupLetter} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <h3 className="text-xl font-bold mb-4 text-blue-400">Grupo {groupLetter}</h3>
                  <div className="mb-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800 text-xs">
                        <tr>
                          <th className="p-2 text-left">Pos</th>
                          <th className="p-2 text-left">Equipo</th>
                          <th className="p-2 text-center">PJ</th>
                          <th className="p-2 text-center">Pts</th>
                          <th className="p-2 text-center">GF</th>
                          <th className="p-2 text-center">GC</th>
                          <th className="p-2 text-center">DG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((stats, idx) => (
                          <tr key={stats.team} className={`border-b border-gray-800 ${idx < 2 ? 'bg-green-900 bg-opacity-20' : ''}`}>
                            <td className="p-2 font-semibold">{idx + 1}</td>
                            <td className="p-2">{stats.team}</td>
                            <td className="p-2 text-center">{stats.played}</td>
                            <td className="p-2 text-center font-bold">{stats.points}</td>
                            <td className="p-2 text-center">{stats.goalsFor}</td>
                            <td className="p-2 text-center">{stats.goalsAgainst}</td>
                            <td className="p-2 text-center">{stats.goalDifference > 0 ? '+' : ''}{stats.goalDifference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="space-y-2">
                    {groupMatches.map(match => (
                      <div key={match.id} className="flex items-center justify-between bg-gray-800 p-3 rounded">
                        <span className="w-2/5 text-right text-sm">{match.homeTeam}</span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="border border-gray-700 bg-gray-900 text-white p-1 w-12 text-center rounded focus:outline-none focus:border-blue-500"
                            value={predictions[match.id]?.homeGoals ?? 0}
                            onFocus={handleFocus}
                            onBlur={() => handleBlur(match.id, "homeGoals")}
                            onChange={e => handlePredictionChange(match.id, "homeGoals", e.target.value)}
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="border border-gray-700 bg-gray-900 text-white p-1 w-12 text-center rounded focus:outline-none focus:border-blue-500"
                            value={predictions[match.id]?.awayGoals ?? 0}
                            onFocus={handleFocus}
                            onBlur={() => handleBlur(match.id, "awayGoals")}
                            onChange={e => handlePredictionChange(match.id, "awayGoals", e.target.value)}
                          />
                        </div>
                        <span className="w-2/5 text-sm">{match.awayTeam}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {groupedMatches.knockout.length > 0 && (
            <>
              <h2 className="text-2xl font-bold mb-4">Eliminatorias</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-6 overflow-x-auto">
                <div className="flex justify-between gap-4 min-w-[1400px]">
                  <div className="flex flex-col gap-8 w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Round of 32</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Round of 32")
                      .slice(0, 8)
                      .map(renderMatch)}
                  </div>

                  <div className="flex flex-col gap-16 w-48 pt-12">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Round of 16</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Round of 16")
                      .slice(0, 4)
                      .map(renderMatch)}
                  </div>

                  <div className="flex flex-col gap-32 w-48 pt-28">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Quarter-final</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Quarterfinal" || m.phase === "Quarter-final")
                      .slice(0, 2)
                      .map(renderMatch)}
                  </div>

                  <div className="flex flex-col gap-64 w-48 pt-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Semi-final</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Semifinal" || m.phase === "Semi-final")
                      .slice(0, 1)
                      .map(renderMatch)}
                  </div>

                  <div className="flex flex-col justify-center w-56 gap-4">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Final</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Final")
                      .map(match => (
                        <div key={match.id} className="bg-gray-800 border-2 border-yellow-500 rounded shadow-lg shadow-yellow-500/20">
                          <div className="flex items-center justify-between p-3 border-b border-gray-700">
                            <span className="text-sm flex-1 font-semibold">{match.homeTeam}</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="border border-gray-600 bg-gray-900 text-white p-1 w-10 text-center rounded text-sm font-bold"
                              value={predictions[match.id]?.homeGoals ?? 0}
                              onFocus={handleFocus}
                              onBlur={() => handleBlur(match.id, "homeGoals")}
                              onChange={e => handlePredictionChange(match.id, "homeGoals", e.target.value)}
                            />
                          </div>
                          <div className="flex items-center justify-between p-3">
                            <span className="text-sm flex-1 font-semibold">{match.awayTeam}</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="border border-gray-600 bg-gray-900 text-white p-1 w-10 text-center rounded text-sm font-bold"
                              value={predictions[match.id]?.awayGoals ?? 0}
                              onFocus={handleFocus}
                              onBlur={() => handleBlur(match.id, "awayGoals")}
                              onChange={e => handlePredictionChange(match.id, "awayGoals", e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Third Place")
                      .map(match => (
                        <div key={match.id} className="mt-8">
                          <div className="text-center text-xs text-gray-400 mb-2">Play-off for third place</div>
                          {renderMatch(match)}
                        </div>
                      ))}
                  </div>

                  <div className="flex flex-col gap-64 w-48 pt-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Semi-final</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Semifinal" || m.phase === "Semi-final")
                      .slice(1, 2)
                      .map(renderMatch)}
                  </div>

                  <div className="flex flex-col gap-32 w-48 pt-28">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Quarter-final</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Quarterfinal" || m.phase === "Quarter-final")
                      .slice(2, 4)
                      .map(renderMatch)}
                  </div>

                  <div className="flex flex-col gap-16 w-48 pt-12">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Round of 16</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Round of 16")
                      .slice(4, 8)
                      .map(renderMatch)}
                  </div>

                  <div className="flex flex-col gap-8 w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Round of 32</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Round of 32")
                      .slice(8, 16)
                      .map(renderMatch)}
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700 font-semibold text-lg"
            onClick={handleSubmit}
          >
            Enviar Porra
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className={`bg-gray-900 rounded-lg shadow-xl max-w-md w-full border-2 ${
            modalType === "success" ? "border-green-500" : "border-red-500"
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-xl font-bold ${
                  modalType === "success" ? "text-green-400" : "text-red-400"
                }`}>
                  {modalType === "success" ? "✓ Éxito" : "Error"}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-white text-lg">{modalMessage}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}