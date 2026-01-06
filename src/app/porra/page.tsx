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

type PenaltyWinner = "home" | "away" | null;

export default function PorraPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [porraName, setPorraName] = useState("");
  const [pichichi, setPichichi] = useState("");
  const [predictions, setPredictions] = useState<Record<number, { homeGoals: PredictionValue; awayGoals: PredictionValue }>>({});
  const [penaltyWinners, setPenaltyWinners] = useState<Record<number, PenaltyWinner>>({});
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

      // Ordenar con criterios FIFA
      const teams = Object.values(statsMap);
      
      return teams.sort((a, b) => {
        // 1. Puntos
        if (b.points !== a.points) return b.points - a.points;

        // 2. Enfrentamiento directo (si están empatados a puntos)
        const tiedTeams = teams.filter(t => t.points === a.points);
        
        if (tiedTeams.length === 2 && tiedTeams.includes(a) && tiedTeams.includes(b)) {
          // Empate entre 2 equipos: buscar el partido entre ellos
          const directMatch = groupMatches.find(m => 
            (m.homeTeam === a.team && m.awayTeam === b.team) ||
            (m.homeTeam === b.team && m.awayTeam === a.team)
          );

          if (directMatch) {
            const pred = predictions[directMatch.id];
            if (pred) {
              const homeGoals = typeof pred.homeGoals === "number" ? pred.homeGoals : 0;
              const awayGoals = typeof pred.awayGoals === "number" ? pred.awayGoals : 0;

              if (directMatch.homeTeam === a.team) {
                if (homeGoals > awayGoals) return -1; // a gana
                if (homeGoals < awayGoals) return 1;  // b gana
              } else {
                if (awayGoals > homeGoals) return -1; // a gana
                if (awayGoals < homeGoals) return 1;  // b gana
              }
            }
          }
        } else if (tiedTeams.length >= 3 && tiedTeams.includes(a) && tiedTeams.includes(b)) {
          // Empate entre 3 o más equipos: calcular mini-tabla
          const tiedTeamNames = tiedTeams.map(t => t.team);
          const miniTableStats: Record<string, { points: number; gd: number; gf: number }> = {};

          tiedTeamNames.forEach(team => {
            miniTableStats[team] = { points: 0, gd: 0, gf: 0 };
          });

          groupMatches.forEach(match => {
            if (tiedTeamNames.includes(match.homeTeam) && tiedTeamNames.includes(match.awayTeam)) {
              const pred = predictions[match.id];
              if (pred) {
                const homeGoals = typeof pred.homeGoals === "number" ? pred.homeGoals : 0;
                const awayGoals = typeof pred.awayGoals === "number" ? pred.awayGoals : 0;

                miniTableStats[match.homeTeam].gf += homeGoals;
                miniTableStats[match.homeTeam].gd += (homeGoals - awayGoals);
                miniTableStats[match.awayTeam].gf += awayGoals;
                miniTableStats[match.awayTeam].gd += (awayGoals - homeGoals);

                if (homeGoals > awayGoals) {
                  miniTableStats[match.homeTeam].points += 3;
                } else if (homeGoals < awayGoals) {
                  miniTableStats[match.awayTeam].points += 3;
                } else {
                  miniTableStats[match.homeTeam].points += 1;
                  miniTableStats[match.awayTeam].points += 1;
                }
              }
            }
          });

          const aMini = miniTableStats[a.team];
          const bMini = miniTableStats[b.team];

          if (bMini.points !== aMini.points) return bMini.points - aMini.points;
          if (bMini.gd !== aMini.gd) return bMini.gd - aMini.gd;
          if (bMini.gf !== aMini.gf) return bMini.gf - aMini.gf;
        }

        // 3. Diferencia de goles general
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;

        // 4. Goles a favor general
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

    // Calcular mejores terceros (top 8)
    const thirdPlaceTeams = Object.keys(groupStandings).map(groupKey => {
      const standings = groupStandings[groupKey];
      const thirdPlace = standings[2]; // Índice 2 = 3º puesto
      
      return thirdPlace ? {
        ...thirdPlace,
        group: groupKey,
      } : null;
    }).filter(Boolean) as (TeamStats & { group: string })[];

    // Ordenar terceros por: puntos > diferencia de goles > goles a favor
    const sortedThirdPlace = thirdPlaceTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // Tomar solo los 8 mejores terceros
    const bestThirds = sortedThirdPlace.slice(0, 8);

    // Función para resolver nombres de equipos
    const resolveTeamName = (placeholder: string): string => {
      // Patrón: "1º Grupo A", "2º Grupo B"
      const singleGroupPattern = /^([1-2])º Grupo ([A-L])$/i;
      const singleMatch = placeholder.match(singleGroupPattern);
      
      if (singleMatch) {
        const position = parseInt(singleMatch[1]) - 1;
        const groupLetter = singleMatch[2].toUpperCase();
        
        const standings = groupStandings[groupLetter];
        if (standings && standings[position]) {
          return standings[position].team;
        }
      }

      // Patrón: "3º Grupo A/B/C/D" (mejores terceros de grupos específicos)
      const thirdPlacePattern = /^3º Grupo ([A-L](?:\/[A-L])+)$/i;
      const thirdMatch = placeholder.match(thirdPlacePattern);
      
      if (thirdMatch) {
        const allowedGroups = thirdMatch[1].toUpperCase().split('/');
        
        // Filtrar solo los mejores 8 terceros de los grupos permitidos
        const eligibleThirds = bestThirds.filter(team => 
          allowedGroups.includes(team.group)
        );
        
        // Asignar el primer tercero disponible que no haya sido usado
        for (const third of eligibleThirds) {
          const teamKey = `${third.team}_${third.group}`;
          if (!usedThirds.has(teamKey)) {
            usedThirds.add(teamKey);
            return third.team;
          }
        }
        
        return placeholder;
      }

      // Patrón: "Ganador Partido X"
      const winnerPattern = /^(?:Ganador|Perdedor)(?: del| de)? Partido (\d+)$/i;
      const winnerMatch = placeholder.match(winnerPattern);
      
      if (winnerMatch) {
        const matchId = parseInt(winnerMatch[1]);
        const isLoser = placeholder.toLowerCase().includes('perdedor');
        
        const pred = predictions[matchId];
        if (!pred || pred.homeGoals === "" || pred.awayGoals === "") {
          return placeholder;
        }

        const homeGoals = typeof pred.homeGoals === "number" ? pred.homeGoals : 0;
        const awayGoals = typeof pred.awayGoals === "number" ? pred.awayGoals : 0;
        const match = matches.find(m => m.id === matchId);
        
        if (!match) return placeholder;

        let winner: string | null = null;
        let loser: string | null = null;

        if (homeGoals > awayGoals) {
          winner = match.homeTeam;
          loser = match.awayTeam;
        } else if (awayGoals > homeGoals) {
          winner = match.awayTeam;
          loser = match.homeTeam;
        } else {
          const penaltyWinner = penaltyWinners[matchId];
          if (penaltyWinner === "home") {
            winner = match.homeTeam;
            loser = match.awayTeam;
          } else if (penaltyWinner === "away") {
            winner = match.awayTeam;
            loser = match.homeTeam;
          }
        }

        if (isLoser && loser) return loser;
        if (!isLoser && winner) return winner;
        
        return placeholder;
      }

      return placeholder;
    };

    // Procesar partidos eliminatorios
    const usedThirds = new Set<string>();
    
    const sortedKnockoutMatches = matches
      .filter(m => m.phase !== "Group")
      .sort((a, b) => a.id - b.id);

    // Agregar todos los partidos knockout
    sortedKnockoutMatches.forEach(match => {
      knockout.push({ ...match });
    });

    // Resolver nombres iterativamente hasta que no haya más cambios
    let hasChanges = true;
    let iterations = 0;
    const maxIterations = 10;

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false;
      iterations++;

      for (let i = 0; i < knockout.length; i++) {
        const originalHome = knockout[i].homeTeam;
        const originalAway = knockout[i].awayTeam;

        const newHome = resolveTeamName(knockout[i].homeTeam);
        const newAway = resolveTeamName(knockout[i].awayTeam);

        if (newHome !== originalHome || newAway !== originalAway) {
          hasChanges = true;
          knockout[i] = {
            ...knockout[i],
            homeTeam: newHome,
            awayTeam: newAway,
          };
        }
      }
    }

    return { groups, knockout, groupStandings };
  }, [matches, predictions, penaltyWinners]);

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

  const handleNameChange = (field: 'participantName' | 'porraName', value: string) => {
    // Permitir solo letras (de cualquier alfabeto), números y espacios
    const sanitized = value.replace(/[^\p{L}\p{N}\s]/gu, '');
    
    if (field === 'participantName') {
      setParticipantName(sanitized);
    } else {
      setPorraName(sanitized);
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
          predictions: matches.map(match => {
            const basePredicton = {
              matchId: match.id,
              homeGoals: typeof predictions[match.id].homeGoals === "number" ? predictions[match.id].homeGoals : 0,
              awayGoals: typeof predictions[match.id].awayGoals === "number" ? predictions[match.id].awayGoals : 0,
            };

            // Solo añadir homeTeam y awayTeam para partidos de knockout
            if (match.phase !== "Group") {
              const resolvedMatch = groupedMatches.knockout.find(m => m.id === match.id);
              if (resolvedMatch) {
                return {
                  ...basePredicton,
                  homeTeam: resolvedMatch.homeTeam,
                  awayTeam: resolvedMatch.awayTeam,
                };
              }
            }
            return basePredicton;
          }),
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

  const renderMatch = (match: Match) => {
    const pred = predictions[match.id];
    const homeGoals = typeof pred?.homeGoals === "number" ? pred.homeGoals : 0;
    const awayGoals = typeof pred?.awayGoals === "number" ? pred.awayGoals : 0;
    const isDraw = homeGoals === awayGoals && pred?.homeGoals !== "" && pred?.awayGoals !== "";
    const isKnockout = match.phase !== "Group";
    const needsPenalty = isDraw && isKnockout;

    return (
      <div key={match.id} className="flex gap-1">
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded">
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
        {needsPenalty && (
          <div className="w-10 bg-gray-900 bg-opacity-30 border border-gray-700 rounded flex flex-col justify-center gap-0.5 p-1">
            <button
              type="button"
              onClick={() => setPenaltyWinners(prev => ({ ...prev, [match.id]: "home" }))}
              className={`w-full h-10 flex items-center justify-center text-sm rounded transition-all ${
                penaltyWinners[match.id] === "home"
                  ? "bg-gray-600 text-yellow-100"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
              title="Local gana en penaltis"
            >
              {penaltyWinners[match.id] === "home" ? "👑" : ""}
            </button>
            <button
              type="button"
              onClick={() => setPenaltyWinners(prev => ({ ...prev, [match.id]: "away" }))}
              className={`w-full h-10 flex items-center justify-center text-sm rounded transition-all ${
                penaltyWinners[match.id] === "away"
                  ? "bg-gray-600 text-yellow-100"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
              title="Visitante gana en penaltis"
            >
              {penaltyWinners[match.id] === "away" ? "👑" : ""}
            </button>
          </div>
        )}
      </div>
    );
  };

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
                  maxLength={35}
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Juan Pérez"
                  value={participantName}
                  onChange={e => handleNameChange('participantName', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nombre de la porra:</label>
                <input
                  type="text"
                  maxLength={35}
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Porra Oficina 2026"
                  value={porraName}
                  onChange={e => handleNameChange('porraName', e.target.value)}
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
                <div className="flex justify-between gap-4 min-w-[1400px] h-[1200px]">
                  {/* Round of 32 - Izquierda */}
                  <div className="flex flex-col justify-around w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Round of 32</div>
                    <div className="flex flex-col justify-around flex-1">
                      {groupedMatches.knockout
                        .filter(m => m.phase === "Round of 32")
                        .slice(0, 8)
                        .map(renderMatch)}
                    </div>
                  </div>

                  {/* Round of 16 - Izquierda */}
                  <div className="flex flex-col justify-around w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Round of 16</div>
                    <div className="flex flex-col justify-around flex-1">
                      {groupedMatches.knockout
                        .filter(m => m.phase === "Round of 16")
                        .slice(0, 4)
                        .map(renderMatch)}
                    </div>
                  </div>

                  {/* Quarter-final - Izquierda */}
                  <div className="flex flex-col justify-around w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Quarter-final</div>
                    <div className="flex flex-col justify-around flex-1">
                      {groupedMatches.knockout
                        .filter(m => m.phase === "Quarterfinal" || m.phase === "Quarter-final")
                        .slice(0, 2)
                        .map(renderMatch)}
                    </div>
                  </div>

                  {/* Semi-final - Izquierda */}
                  <div className="flex flex-col justify-around w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Semi-final</div>
                    <div className="flex flex-col justify-around flex-1">
                      {groupedMatches.knockout
                        .filter(m => m.phase === "Semifinal" || m.phase === "Semi-final")
                        .slice(0, 1)
                        .map(renderMatch)}
                    </div>
                  </div>

                  {/* Final y Tercer Puesto */}
                  <div className="flex flex-col justify-center w-56 gap-4">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Final</div>
                    {groupedMatches.knockout
                      .filter(m => m.phase === "Final")
                      .map(match => (
                        <div key={match.id} className="border-2 border-yellow-500 rounded shadow-lg shadow-yellow-500/20">
                          {renderMatch(match)}
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

                  {/* Semi-final - Derecha */}
                  <div className="flex flex-col justify-around w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Semi-final</div>
                    <div className="flex flex-col justify-around flex-1">
                      {groupedMatches.knockout
                        .filter(m => m.phase === "Semifinal" || m.phase === "Semi-final")
                        .slice(1, 2)
                        .map(renderMatch)}
                    </div>
                  </div>

                  {/* Quarter-final - Derecha */}
                  <div className="flex flex-col justify-around w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Quarter-final</div>
                    <div className="flex flex-col justify-around flex-1">
                      {groupedMatches.knockout
                        .filter(m => m.phase === "Quarterfinal" || m.phase === "Quarter-final")
                        .slice(2, 4)
                        .map(renderMatch)}
                    </div>
                  </div>

                  {/* Round of 16 - Derecha */}
                  <div className="flex flex-col justify-around w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Round of 16</div>
                    <div className="flex flex-col justify-around flex-1">
                      {groupedMatches.knockout
                        .filter(m => m.phase === "Round of 16")
                        .slice(4, 8)
                        .map(renderMatch)}
                    </div>
                  </div>

                  {/* Round of 32 - Derecha */}
                  <div className="flex flex-col justify-around w-48">
                    <div className="text-center text-sm font-semibold text-blue-400 mb-2">Round of 32</div>
                    <div className="flex flex-col justify-around flex-1">
                      {groupedMatches.knockout
                        .filter(m => m.phase === "Round of 32")
                        .slice(8, 16)
                        .map(renderMatch)}
                    </div>
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