"use client";

import { useState, useEffect, useMemo } from "react";
import bestThirdsCombinations from '../../../../public/bestThirdsCombinations.json';

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  phase: string;
  group?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  isFinished?: boolean;
  penaltyWinner?: string | null;
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

// Función para ordenar los mejores terceros según enfrentamientos
function orderBestThirdsByJSON(bestThirds: (TeamStats & { group: string })[]) {
  const groupLetters = bestThirds
    .map(team => team.group)
    .sort()
    .join('');
  
  const orderFromJSON = bestThirdsCombinations[groupLetters as keyof typeof bestThirdsCombinations];
  
  if (!orderFromJSON) {
    console.warn(`No se encontró la combinación "${groupLetters}" en el JSON`);
    return bestThirds;
  }
  
  const orderedBestThirds = orderFromJSON.map(groupLetter => {
    return bestThirds.find(team => team.group === groupLetter);
  }).filter(Boolean) as (TeamStats & { group: string })[];
  
  return orderedBestThirds;
}

export default function ResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then(res => res.json())
      .then((data: Match[]) => {
        setMatches(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading matches:", err);
        setLoading(false);
      });
  }, []);

  // Calcular todas las clasificaciones de grupos y resolver brackets
  const groupedMatches = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    const groupStandings: Record<string, TeamStats[]> = {};
    const knockout: Match[] = [];

    const calculateGroupStandings = (groupMatches: Match[]): TeamStats[] => {
      const statsMap: Record<string, TeamStats> = {};

      groupMatches.forEach(match => {
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

        // Solo contar partidos finalizados
        if (!match.isFinished || match.homeGoals === null || match.awayGoals === null || match.homeGoals === undefined || match.awayGoals === undefined) return;

        const homeGoals = match.homeGoals;
        const awayGoals = match.awayGoals;

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

      const teams = Object.values(statsMap);
      
      return teams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;

        const tiedTeams = teams.filter(t => t.points === a.points);
        
        if (tiedTeams.length === 2 && tiedTeams.includes(a) && tiedTeams.includes(b)) {
          const directMatch = groupMatches.find(m => 
            (m.homeTeam === a.team && m.awayTeam === b.team) ||
            (m.homeTeam === b.team && m.awayTeam === a.team)
          );

          if (directMatch && directMatch.isFinished && directMatch.homeGoals !== null && directMatch.awayGoals !== null && directMatch.homeGoals !== undefined && directMatch.awayGoals !== undefined) {
            const homeGoals = directMatch.homeGoals;
            const awayGoals = directMatch.awayGoals;

            if (directMatch.homeTeam === a.team) {
              if (homeGoals > awayGoals) return -1;
              if (homeGoals < awayGoals) return 1;
            } else {
              if (awayGoals > homeGoals) return -1;
              if (awayGoals < homeGoals) return 1;
            }
          }
        } else if (tiedTeams.length >= 3 && tiedTeams.includes(a) && tiedTeams.includes(b)) {
          const tiedTeamNames = tiedTeams.map(t => t.team);
          const miniTableStats: Record<string, { points: number; gd: number; gf: number }> = {};

          tiedTeamNames.forEach(team => {
            miniTableStats[team] = { points: 0, gd: 0, gf: 0 };
          });

          groupMatches.forEach(match => {
            if (tiedTeamNames.includes(match.homeTeam) && tiedTeamNames.includes(match.awayTeam)) {
              if (match.isFinished && match.homeGoals !== null && match.awayGoals !== null && match.homeGoals !== undefined && match.awayGoals !== undefined) {
                const homeGoals = match.homeGoals;
                const awayGoals = match.awayGoals;

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

        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
    };

    matches.forEach(match => {
      if (match.phase === "Group" && match.group) {
        const groupLetter = match.group.replace('Group ', '');
        if (!groups[groupLetter]) groups[groupLetter] = [];
        groups[groupLetter].push(match);
      }
    });

    Object.keys(groups).forEach(groupKey => {
      groupStandings[groupKey] = calculateGroupStandings(groups[groupKey]);
    });

    const thirdPlaceTeams = Object.keys(groupStandings).map(groupKey => {
      const standings = groupStandings[groupKey];
      const thirdPlace = standings[2];
      
      return thirdPlace ? {
        ...thirdPlace,
        group: groupKey,
      } : null;
    }).filter(Boolean) as (TeamStats & { group: string })[];

    const sortedThirdPlace = thirdPlaceTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    const bestThirds = sortedThirdPlace.slice(0, 8);
    const orderedThirds = orderBestThirdsByJSON(bestThirds);

    const resolveTeamName = (placeholder: string, matchId: number): string => {
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

      const thirdPlacePattern = /^3º Grupo [A-L\/]+$/i;
      if (placeholder.match(thirdPlacePattern)) {
        const thirdPlaceMapping: Record<number, number> = {
          73: 3,
          74: 5,
          79: 2,
          80: 4,
          83: 0,
          84: 7,
          87: 1,
          88: 6
        };

        if (thirdPlaceMapping[matchId] !== undefined) {
          const thirdIndex = thirdPlaceMapping[matchId];
          if (orderedThirds[thirdIndex]) {
            return orderedThirds[thirdIndex].team;
          }
        }
      }

      const winnerPattern = /^(?:Ganador|Perdedor)(?: del| de)? Partido (\d+)$/i;
      const winnerMatch = placeholder.match(winnerPattern);
      
      if (winnerMatch) {
        const refMatchId = parseInt(winnerMatch[1]);
        const isLoser = placeholder.toLowerCase().includes('perdedor');
        
        const match = knockout.find(m => m.id === refMatchId);
        if (!match || !match.isFinished || match.homeGoals === null || match.awayGoals === null || match.homeGoals === undefined || match.awayGoals === undefined) {
          return placeholder;
        }

        const homeGoals = match.homeGoals;
        const awayGoals = match.awayGoals;

        let winner: string | null = null;
        let loser: string | null = null;

        if (homeGoals > awayGoals) {
          winner = match.homeTeam;
          loser = match.awayTeam;
        } else if (awayGoals > homeGoals) {
          winner = match.awayTeam;
          loser = match.homeTeam;
        } else {
          // Empate - usar penaltyWinner
          if (match.penaltyWinner) {
            if (match.penaltyWinner === "home") {
              winner = match.homeTeam;
              loser = match.awayTeam;
            } else {
              winner = match.awayTeam;
              loser = match.homeTeam;
            }
          }
        }

        if (isLoser && loser) return loser;
        if (!isLoser && winner) return winner;
        
        return placeholder;
      }

      return placeholder;
    };

    const sortedKnockoutMatches = matches
      .filter(m => m.phase !== "Group")
      .sort((a, b) => a.id - b.id);

    sortedKnockoutMatches.forEach(match => {
      knockout.push({ ...match });
    });

    let hasChanges = true;
    let iterations = 0;
    const maxIterations = 10;

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false;
      iterations++;

      for (let i = 0; i < knockout.length; i++) {
        const originalHome = knockout[i].homeTeam;
        const originalAway = knockout[i].awayTeam;

        const newHome = resolveTeamName(knockout[i].homeTeam, knockout[i].id);
        const newAway = resolveTeamName(knockout[i].awayTeam, knockout[i].id);

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
  }, [matches]);

  const renderMatch = (match: Match) => {
    const isFinished = match.isFinished ?? false;
    const homeGoals = match.homeGoals !== undefined && match.homeGoals !== null ? match.homeGoals : null;
    const awayGoals = match.awayGoals !== undefined && match.awayGoals !== null ? match.awayGoals : null;
    const hasPenalties = match.penaltyWinner && homeGoals !== null && awayGoals !== null && homeGoals === awayGoals;

    return (
      <div key={match.id} className={`border rounded ${
        isFinished ? 'bg-blue-900 bg-opacity-20 border-blue-700' : 'bg-gray-800 border-gray-700'
      }`}>
        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          <span className="text-sm flex-1">{match.homeTeam}</span>
          <div className="flex items-center">
            {isFinished && homeGoals !== null ? (
              <>
                {hasPenalties && match.penaltyWinner === "home" && (
                  <span className="text-yellow-400 text-xs font-bold">👑</span>
                )}
                <span className="font-bold text-lg w-8 text-center">{homeGoals}</span>
              </>
            ) : (
              <span className="text-gray-500 text-sm">-</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between p-2">
          <span className="text-sm flex-1">{match.awayTeam}</span>
          <div className="flex items-center">
            {isFinished && awayGoals !== null ? (
              <>
                {hasPenalties && match.penaltyWinner === "away" && (
                  <span className="text-yellow-400 text-xs font-bold">👑</span>
                )}
                <span className="font-bold text-lg w-8 text-center">{awayGoals}</span>
              </>
            ) : (
              <span className="text-gray-500 text-sm">-</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Cargando resultados...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black bg-center bg-no-repeat bg-fixed text-white pt-16"
    style={{ backgroundImage: `url('/background.avif')` }}>
      <div className="max-w-8xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Resultados Reales - Mundial 2026</h1>

        <h2 className="text-2xl font-bold mb-4">Fase de Grupos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {Object.entries(groupedMatches.groups).sort().map(([groupLetter, groupMatches]) => {
            const standings = groupedMatches.groupStandings[groupLetter] || [];
            
            return (
              <div key={groupLetter} className="bg-gray-900/80 border border-gray-800 rounded-lg p-5">
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
                  {groupMatches.map(match => {
                    const isFinished = match.isFinished ?? false;
                    const homeGoals = match.homeGoals !== undefined && match.homeGoals !== null ? match.homeGoals : null;
                    const awayGoals = match.awayGoals !== undefined && match.awayGoals !== null ? match.awayGoals : null;
                    
                    return (
                      <div key={match.id} className={`flex items-center justify-between p-3 rounded ${
                        isFinished ? 'bg-blue-900' : 'bg-gray-800'
                      }`}>
                        <span className="w-2/5 text-right text-sm pr-3">{match.homeTeam}</span>
                        <div className="flex items-center space-x-2">
                          {isFinished && homeGoals !== null && awayGoals !== null ? (
                            <>
                              <span className="font-bold text-lg w-8 text-center">{homeGoals}</span>
                              <span className="text-gray-500">-</span>
                              <span className="font-bold text-lg w-8 text-center">{awayGoals}</span>
                            </>
                          ) : (
                            <span className="text-gray-500 text-sm">vs</span>
                          )}
                        </div>
                        <span className="w-2/5 text-sm pl-3">{match.awayTeam}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {groupedMatches.knockout.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Eliminatorias</h2>
            <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-8 mb-6 overflow-x-auto">
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
      </div>
    </div>
  );
}