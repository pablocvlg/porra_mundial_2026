import { prisma } from './prisma';
import { Match, Prediction } from '@prisma/client';

// Definir las nuevas reglas de puntuación
const POINTS_RULES = {
  GROUP: {
    CORRECT_WINNER: 3,  // Acertar ganador (incluyendo empate)
  },
  QUALIFICATION: {
    TEAM_QUALIFIES: 5,      // Equipo pasa a brackets
    CORRECT_POSITION: 3,    // Equipo en posición correcta (1º, 2º, 3º)
  }
};

// Función para calcular puntos por resultado exacto
function calculateExactScorePoints(homeGoals: number, awayGoals: number): number {
  const totalGoals = homeGoals + awayGoals;
  
  // Si hay 1 gol o menos en total, dar 1 punto
  if (totalGoals <= 1) {
    return 1;
  }
  
  // Si hay más de 1 gol, dar tantos puntos como goles haya
  return totalGoals;
}

export function calculateMatchPoints(
  prediction: Prediction,
  match: Match
): number {
  // Solo calcular puntos si el partido está finalizado
  if (!match.isFinished || match.homeGoals === null || match.awayGoals === null) {
    return 0;
  }

  let points = 0;
  const isGroup = match.phase === 'Group';

  // Solo calcular puntos de partidos de fase de grupos
  if (isGroup) {
    // Determinar ganador de la predicción
    const predWinner = prediction.homeGoals > prediction.awayGoals ? 'home' : 
                       prediction.awayGoals > prediction.homeGoals ? 'away' : 'draw';
    
    // Determinar ganador del partido real
    const matchWinner = match.homeGoals > match.awayGoals ? 'home' : 
                        match.awayGoals > match.homeGoals ? 'away' : 'draw';

    // Puntos por acertar ganador (incluyendo empate)
    if (predWinner === matchWinner) {
      points += POINTS_RULES.GROUP.CORRECT_WINNER;
    }

    // Puntos por acertar resultado exacto
    if (prediction.homeGoals === match.homeGoals && 
        prediction.awayGoals === match.awayGoals) {
      const exactScorePoints = calculateExactScorePoints(match.homeGoals, match.awayGoals);
      points += exactScorePoints;
    }
  }

  return points;
}

// Tipos para estadísticas de equipos
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

// Función para calcular standings de un grupo (basada en tu frontend)
function calculateGroupStandings(
  groupMatches: Array<{ prediction: Prediction; match: Match }>,
  usePrediction: boolean
): TeamStats[] {
  const statsMap: Record<string, TeamStats> = {};

  groupMatches.forEach(({ prediction, match }) => {
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;

    if (!homeTeam || !awayTeam) return;

    // Inicializar equipos si no existen
    [homeTeam, awayTeam].forEach(team => {
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

    // Usar predicción o resultado real según el parámetro
    const homeGoals = usePrediction 
      ? prediction.homeGoals 
      : (match.homeGoals ?? 0);
    const awayGoals = usePrediction 
      ? prediction.awayGoals 
      : (match.awayGoals ?? 0);

    // Actualizar estadísticas
    statsMap[homeTeam].played++;
    statsMap[awayTeam].played++;
    statsMap[homeTeam].goalsFor += homeGoals;
    statsMap[homeTeam].goalsAgainst += awayGoals;
    statsMap[awayTeam].goalsFor += awayGoals;
    statsMap[awayTeam].goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      statsMap[homeTeam].won++;
      statsMap[homeTeam].points += 3;
      statsMap[awayTeam].lost++;
    } else if (homeGoals < awayGoals) {
      statsMap[awayTeam].won++;
      statsMap[awayTeam].points += 3;
      statsMap[homeTeam].lost++;
    } else {
      statsMap[homeTeam].drawn++;
      statsMap[awayTeam].drawn++;
      statsMap[homeTeam].points += 1;
      statsMap[awayTeam].points += 1;
    }
  });

  // Calcular diferencia de goles
  Object.values(statsMap).forEach(stats => {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  });

  // Ordenar con criterios FIFA (igual que tu frontend)
  const teams = Object.values(statsMap);
  
  return teams.sort((a, b) => {
    // 1. Puntos
    if (b.points !== a.points) return b.points - a.points;

    // 2. Enfrentamiento directo (si están empatados a puntos)
    const tiedTeams = teams.filter(t => t.points === a.points);
    
    if (tiedTeams.length === 2 && tiedTeams.includes(a) && tiedTeams.includes(b)) {
      // Empate entre 2 equipos: buscar el partido entre ellos
      const directMatch = groupMatches.find(gm => 
        (gm.match.homeTeam === a.team && gm.match.awayTeam === b.team) ||
        (gm.match.homeTeam === b.team && gm.match.awayTeam === a.team)
      );

      if (directMatch) {
        const homeGoals = usePrediction 
          ? directMatch.prediction.homeGoals 
          : (directMatch.match.homeGoals ?? 0);
        const awayGoals = usePrediction 
          ? directMatch.prediction.awayGoals 
          : (directMatch.match.awayGoals ?? 0);

        if (directMatch.match.homeTeam === a.team) {
          if (homeGoals > awayGoals) return -1; // a gana
          if (homeGoals < awayGoals) return 1;  // b gana
        } else {
          if (awayGoals > homeGoals) return -1; // a gana
          if (awayGoals < homeGoals) return 1;  // b gana
        }
      }
    } else if (tiedTeams.length >= 3 && tiedTeams.includes(a) && tiedTeams.includes(b)) {
      // Empate entre 3 o más equipos: calcular mini-tabla
      const tiedTeamNames = tiedTeams.map(t => t.team);
      const miniTableStats: Record<string, { points: number; gd: number; gf: number }> = {};

      tiedTeamNames.forEach(team => {
        miniTableStats[team] = { points: 0, gd: 0, gf: 0 };
      });

      groupMatches.forEach(gm => {
        if (tiedTeamNames.includes(gm.match.homeTeam) && tiedTeamNames.includes(gm.match.awayTeam)) {
          const homeGoals = usePrediction 
            ? gm.prediction.homeGoals 
            : (gm.match.homeGoals ?? 0);
          const awayGoals = usePrediction 
            ? gm.prediction.awayGoals 
            : (gm.match.awayGoals ?? 0);

          miniTableStats[gm.match.homeTeam].gf += homeGoals;
          miniTableStats[gm.match.homeTeam].gd += (homeGoals - awayGoals);
          miniTableStats[gm.match.awayTeam].gf += awayGoals;
          miniTableStats[gm.match.awayTeam].gd += (awayGoals - homeGoals);

          if (homeGoals > awayGoals) {
            miniTableStats[gm.match.homeTeam].points += 3;
          } else if (homeGoals < awayGoals) {
            miniTableStats[gm.match.awayTeam].points += 3;
          } else {
            miniTableStats[gm.match.homeTeam].points += 1;
            miniTableStats[gm.match.awayTeam].points += 1;
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
}

// Función para calcular puntos de clasificación
// Función para calcular puntos de clasificación por grupo (1º y 2º)
export async function calculateGroupQualificationPoints(entryId: number): Promise<number> {
  let qualificationPoints = 0;

  const predictions = await prisma.prediction.findMany({
    where: { entryId },
    include: { match: true }
  });

  const groupPredictions = predictions.filter(p => p.match.phase === 'Group');

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

  // Para cada grupo, verificar si está completo y calcular puntos
  for (const [groupLetter, groupPreds] of Object.entries(groupsByLetter)) {
    // Verificar si ESTE grupo específico está completo
    const groupFinished = groupPreds.every(p => p.match.isFinished);
    
    if (!groupFinished) {
      continue; // Saltar este grupo si no está terminado
    }

    // Convertir a formato esperado
    const groupMatches = groupPreds.map(pred => ({
      prediction: pred,
      match: pred.match
    }));

    // Calcular tabla predicha
    const predictedStandings = calculateGroupStandings(groupMatches, true);
    
    // Calcular tabla real
    const realStandings = calculateGroupStandings(groupMatches, false);

    // Comparar solo posiciones 1º y 2º (siempre clasifican)
    for (let position = 0; position < 2; position++) {
      const predictedTeam = predictedStandings[position]?.team;
      const realTeam = realStandings[position]?.team;

      if (!predictedTeam || !realTeam) continue;

      // Verificar si el equipo que predije clasificó (está en top 2 real)
      const realTop2 = realStandings.slice(0, 2).map(s => s.team);
      
      if (realTop2.includes(predictedTeam)) {
        // El equipo clasificó
        qualificationPoints += POINTS_RULES.QUALIFICATION.TEAM_QUALIFIES;

        // Acerté la posición exacta
        if (predictedTeam === realTeam) {
          qualificationPoints += POINTS_RULES.QUALIFICATION.CORRECT_POSITION;
        }
      }
    }
  }

  return qualificationPoints;
}

// Función para calcular puntos de mejores terceros (solo cuando TODOS los grupos terminen)
export async function calculateBestThirdsPoints(entryId: number): Promise<number> {
  let thirdPlacePoints = 0;

  const predictions = await prisma.prediction.findMany({
    where: { entryId },
    include: { match: true }
  });

  const groupPredictions = predictions.filter(p => p.match.phase === 'Group');

  // Verificar si TODOS los grupos están finalizados
  const allGroupsFinished = groupPredictions.every(p => p.match.isFinished);
  
  if (!allGroupsFinished) {
    return 0; // No calcular terceros hasta que todos los grupos terminen
  }

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

  // Calcular todos los terceros lugares (predichos y reales)
  const predictedThirds: Array<{ team: string; group: string; stats: any }> = [];
  const realThirds: Array<{ team: string; group: string; stats: any }> = [];

  for (const [groupLetter, groupPreds] of Object.entries(groupsByLetter)) {
    const groupMatches = groupPreds.map(pred => ({
      prediction: pred,
      match: pred.match
    }));

    const predictedStandings = calculateGroupStandings(groupMatches, true);
    const realStandings = calculateGroupStandings(groupMatches, false);

    if (predictedStandings[2]) {
      predictedThirds.push({
        team: predictedStandings[2].team,
        group: groupLetter,
        stats: predictedStandings[2]
      });
    }

    if (realStandings[2]) {
      realThirds.push({
        team: realStandings[2].team,
        group: groupLetter,
        stats: realStandings[2]
      });
    }
  }

  // Ordenar terceros predichos
  const sortedPredictedThirds = predictedThirds.sort((a, b) => {
    if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
    if (b.stats.goalDifference !== a.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
    return b.stats.goalsFor - a.stats.goalsFor;
  }).slice(0, 8); // Top 8

  // Ordenar terceros reales
  const sortedRealThirds = realThirds.sort((a, b) => {
    if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
    if (b.stats.goalDifference !== a.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
    return b.stats.goalsFor - a.stats.goalsFor;
  }).slice(0, 8); // Top 8

  const realBestThirdsTeams = sortedRealThirds.map(t => t.team);

  // Calcular puntos por acertar mejores terceros
  sortedPredictedThirds.forEach((predictedThird, index) => {
    // Si el equipo que predije como mejor tercero realmente clasificó
    if (realBestThirdsTeams.includes(predictedThird.team)) {
      thirdPlacePoints += POINTS_RULES.QUALIFICATION.TEAM_QUALIFIES;

      // Si además acerté que quedaría tercero en su grupo
      const realThird = realThirds.find(t => t.group === predictedThird.group);
      if (realThird && realThird.team === predictedThird.team) {
        thirdPlacePoints += POINTS_RULES.QUALIFICATION.CORRECT_POSITION;
      }
    }
  });

  return thirdPlacePoints;
}

// Actualizar la función principal
export async function updateEntryPoints(entryId: number) {
  const predictions = await prisma.prediction.findMany({
    where: { entryId },
    include: { match: true }
  });

  // Calcular puntos de partidos individuales
  let matchPoints = 0;
  for (const pred of predictions) {
    matchPoints += calculateMatchPoints(pred, pred.match);
  }

  // Calcular puntos de clasificación (1º y 2º) - se calcula grupo por grupo
  const groupQualificationPoints = await calculateGroupQualificationPoints(entryId);

  // Calcular puntos de mejores terceros - solo cuando todos los grupos terminen
  const bestThirdsPoints = await calculateBestThirdsPoints(entryId);

  const totalPoints = matchPoints + groupQualificationPoints + bestThirdsPoints;

  await prisma.entry.update({
    where: { id: entryId },
    data: { totalPoints }
  });

  return totalPoints;
}

export async function updateAllPorraPoints(porraId: number) {
  const entries = await prisma.entry.findMany({
    where: { porraId },
    select: { id: true }
  });

  for (const entry of entries) {
    await updateEntryPoints(entry.id);
  }
}