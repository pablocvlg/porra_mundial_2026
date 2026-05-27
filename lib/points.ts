import { prisma } from './prisma';
import { Match, Prediction } from '../generated/prisma/client';

// Cuando se sepa el pichichi, pon el nombre aquí (exactamente igual que lo escriben los participantes)
// Ejemplo: const ACTUAL_PICHICHI = "Kylian Mbappé";
const ACTUAL_PICHICHI: string | null = null;

const POINTS = {
  GROUP: {
    CORRECT_1X2: 3,
    EXACT_SCORE_BASE: 2,
    EXACT_SCORE_EXTRA_PER_GOAL: 1, // +1 por cada gol por encima de 2 en total
  },
  QUALIFICATION: {
    TEAM_QUALIFIES: 4,      // equipo pasa de grupos a dieciseisavos
    CORRECT_POSITION: 3,    // posición exacta (1º, 2º, o mejor tercero)
  },
  KNOCKOUT: {
    ROUND_OF_32_ADVANCE: 5,       // pasa a octavos
    ROUND_OF_16_ADVANCE: 6,       // pasa a cuartos
    QUARTERFINAL_ADVANCE: 7,      // pasa a semifinales
    SEMIFINAL_ADVANCE: 8,         // pasa a la final
    THIRD_PLACE: 3,               // gana partido de 3er puesto
    CRUCE_1X2_BONUS: 1,           // bonus cruce exacto + acertar ganador
    CRUCE_EXACT_SCORE_BONUS: 1,   // bonus cruce exacto + acertar marcador exacto
  },
  FINAL: {
    BOTH_FINALISTS: 4,    // acertar los dos finalistas
    WORLD_CHAMPION: 10,   // acertar el campeón del mundo
  },
  PICHICHI: 5,
  // TODO: el pichichi requiere añadir el campo `actualPichichi String?` al modelo Porra
  // y actualizarlo desde el admin. Una vez añadido, descomentar la lógica en updateEntryPoints.
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

function calculateGroupStandings(
  groupMatches: Array<{ prediction: Prediction; match: Match }>,
  usePrediction: boolean
): TeamStats[] {
  const statsMap: Record<string, TeamStats> = {};

  groupMatches.forEach(({ prediction, match }) => {
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    if (!homeTeam || !awayTeam) return;

    [homeTeam, awayTeam].forEach(team => {
      if (!statsMap[team]) {
        statsMap[team] = { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
      }
    });

    const homeGoals = usePrediction ? prediction.homeGoals : (match.homeGoals ?? 0);
    const awayGoals = usePrediction ? prediction.awayGoals : (match.awayGoals ?? 0);

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

  Object.values(statsMap).forEach(s => {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
  });

  const teams = Object.values(statsMap);

  return teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const tiedTeams = teams.filter(t => t.points === a.points);

    if (tiedTeams.length === 2 && tiedTeams.includes(a) && tiedTeams.includes(b)) {
      const directMatch = groupMatches.find(gm =>
        (gm.match.homeTeam === a.team && gm.match.awayTeam === b.team) ||
        (gm.match.homeTeam === b.team && gm.match.awayTeam === a.team)
      );
      if (directMatch) {
        const hg = usePrediction ? directMatch.prediction.homeGoals : (directMatch.match.homeGoals ?? 0);
        const ag = usePrediction ? directMatch.prediction.awayGoals : (directMatch.match.awayGoals ?? 0);
        if (directMatch.match.homeTeam === a.team) {
          if (hg > ag) return -1;
          if (hg < ag) return 1;
        } else {
          if (ag > hg) return -1;
          if (ag < hg) return 1;
        }
      }
    } else if (tiedTeams.length >= 3 && tiedTeams.includes(a) && tiedTeams.includes(b)) {
      const tiedNames = tiedTeams.map(t => t.team);
      const mini: Record<string, { points: number; gd: number; gf: number }> = {};
      tiedNames.forEach(t => { mini[t] = { points: 0, gd: 0, gf: 0 }; });

      groupMatches.forEach(gm => {
        if (!tiedNames.includes(gm.match.homeTeam) || !tiedNames.includes(gm.match.awayTeam)) return;
        const hg = usePrediction ? gm.prediction.homeGoals : (gm.match.homeGoals ?? 0);
        const ag = usePrediction ? gm.prediction.awayGoals : (gm.match.awayGoals ?? 0);
        mini[gm.match.homeTeam].gf += hg;
        mini[gm.match.homeTeam].gd += hg - ag;
        mini[gm.match.awayTeam].gf += ag;
        mini[gm.match.awayTeam].gd += ag - hg;
        if (hg > ag) mini[gm.match.homeTeam].points += 3;
        else if (hg < ag) mini[gm.match.awayTeam].points += 3;
        else { mini[gm.match.homeTeam].points += 1; mini[gm.match.awayTeam].points += 1; }
      });

      const am = mini[a.team];
      const bm = mini[b.team];
      if (bm.points !== am.points) return bm.points - am.points;
      if (bm.gd !== am.gd) return bm.gd - am.gd;
      if (bm.gf !== am.gf) return bm.gf - am.gf;
    }

    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

// --- Puntos por partido individual ---

function calculateGroupMatchPoints(prediction: Prediction, match: Match): number {
  if (!match.isFinished || match.homeGoals === null || match.awayGoals === null) return 0;

  let points = 0;

  const predWinner = prediction.homeGoals > prediction.awayGoals ? 'home'
    : prediction.awayGoals > prediction.homeGoals ? 'away' : 'draw';
  const matchWinner = match.homeGoals > match.awayGoals ? 'home'
    : match.awayGoals > match.homeGoals ? 'away' : 'draw';

  if (predWinner === matchWinner) {
    points += POINTS.GROUP.CORRECT_1X2;
  }

  if (prediction.homeGoals === match.homeGoals && prediction.awayGoals === match.awayGoals) {
    const totalGoals = match.homeGoals + match.awayGoals;
    points += POINTS.GROUP.EXACT_SCORE_BASE + Math.max(0, totalGoals - 2);
  }

  return points;
}

function getMatchWinner(
  homeTeam: string, awayTeam: string,
  homeGoals: number, awayGoals: number,
  penaltyWinner: string | null
): string | null {
  if (homeGoals > awayGoals) return homeTeam;
  if (awayGoals > homeGoals) return awayTeam;
  if (penaltyWinner === 'home') return homeTeam;
  if (penaltyWinner === 'away') return awayTeam;
  return null;
}

function calculateKnockoutMatchPoints(prediction: Prediction, match: Match): number {
  if (!match.isFinished || match.homeGoals === null || match.awayGoals === null) return 0;
  if (!prediction.homeTeam || !prediction.awayTeam) return 0;

  let points = 0;
  const phase = match.phase;

  const actualWinner = getMatchWinner(match.homeTeam, match.awayTeam, match.homeGoals, match.awayGoals, match.penaltyWinner);
  const predictedWinner = getMatchWinner(prediction.homeTeam, prediction.awayTeam, prediction.homeGoals, prediction.awayGoals, prediction.penaltyWinner);

  // --- FINAL: caso especial ---
  if (phase === 'Final') {
    const bothFinalists =
      (prediction.homeTeam === match.homeTeam && prediction.awayTeam === match.awayTeam) ||
      (prediction.homeTeam === match.awayTeam && prediction.awayTeam === match.homeTeam);

    if (bothFinalists) points += POINTS.FINAL.BOTH_FINALISTS;
    if (predictedWinner && predictedWinner === actualWinner) points += POINTS.FINAL.WORLD_CHAMPION;

    return points;
  }

  // --- Resto de rondas (R32, R16, QF, SF, 3er puesto) ---

  // Puntos por acertar el equipo que avanza
  if (predictedWinner && predictedWinner === actualWinner) {
    if (phase === 'Round of 32') points += POINTS.KNOCKOUT.ROUND_OF_32_ADVANCE;
    else if (phase === 'Round of 16') points += POINTS.KNOCKOUT.ROUND_OF_16_ADVANCE;
    else if (phase === 'Quarterfinal' || phase === 'Quarter-final') points += POINTS.KNOCKOUT.QUARTERFINAL_ADVANCE;
    else if (phase === 'Semifinal' || phase === 'Semi-final') points += POINTS.KNOCKOUT.SEMIFINAL_ADVANCE;
    else if (phase === 'Third Place') points += POINTS.KNOCKOUT.THIRD_PLACE;
  }

  // Bonus por cruce exacto (ambos equipos correctos, independientemente de local/visitante)
  const normalOrder = prediction.homeTeam === match.homeTeam && prediction.awayTeam === match.awayTeam;
  const reverseOrder = prediction.homeTeam === match.awayTeam && prediction.awayTeam === match.homeTeam;

  if (normalOrder || reverseOrder) {
    // +1 por acertar el ganador (1X2)
    if (predictedWinner && predictedWinner === actualWinner) {
      points += POINTS.KNOCKOUT.CRUCE_1X2_BONUS;
    }

    // +1 por acertar el marcador exacto (sin contar penaltis)
    const predH = normalOrder ? prediction.homeGoals : prediction.awayGoals;
    const predA = normalOrder ? prediction.awayGoals : prediction.homeGoals;
    if (predH === match.homeGoals && predA === match.awayGoals) {
      points += POINTS.KNOCKOUT.CRUCE_EXACT_SCORE_BONUS;
    }
  }

  return points;
}

export function calculateMatchPoints(prediction: Prediction, match: Match): number {
  if (match.phase === 'Group') return calculateGroupMatchPoints(prediction, match);
  return calculateKnockoutMatchPoints(prediction, match);
}

// --- Puntos de clasificación de grupos (1º y 2º por grupo) ---

export async function calculateGroupQualificationPoints(entryId: number): Promise<number> {
  let points = 0;

  const predictions = await prisma.prediction.findMany({
    where: { entryId },
    include: { match: true },
  });

  const groupPreds = predictions.filter(p => p.match.phase === 'Group');

  const groupsByLetter: Record<string, typeof groupPreds> = {};
  groupPreds.forEach(pred => {
    const letter = pred.match.group;
    if (letter) {
      if (!groupsByLetter[letter]) groupsByLetter[letter] = [];
      groupsByLetter[letter].push(pred);
    }
  });

  for (const groupPreds of Object.values(groupsByLetter)) {
    // Solo calcular si el grupo está finalizado completamente
    if (!groupPreds.every(p => p.match.isFinished)) continue;

    const groupMatches = groupPreds.map(p => ({ prediction: p, match: p.match }));
    const predicted = calculateGroupStandings(groupMatches, true);
    const real = calculateGroupStandings(groupMatches, false);
    const realTop2 = real.slice(0, 2).map(s => s.team);

    for (let pos = 0; pos < 2; pos++) {
      const predictedTeam = predicted[pos]?.team;
      if (!predictedTeam) continue;

      if (realTop2.includes(predictedTeam)) {
        points += POINTS.QUALIFICATION.TEAM_QUALIFIES;
        if (predictedTeam === real[pos]?.team) {
          points += POINTS.QUALIFICATION.CORRECT_POSITION;
        }
      }
    }
  }

  return points;
}

// --- Puntos por mejores terceros (solo cuando TODOS los grupos han terminado) ---

export async function calculateBestThirdsPoints(entryId: number): Promise<number> {
  let points = 0;

  const predictions = await prisma.prediction.findMany({
    where: { entryId },
    include: { match: true },
  });

  const groupPreds = predictions.filter(p => p.match.phase === 'Group');

  if (!groupPreds.every(p => p.match.isFinished)) return 0;

  const groupsByLetter: Record<string, typeof groupPreds> = {};
  groupPreds.forEach(pred => {
    const letter = pred.match.group;
    if (letter) {
      if (!groupsByLetter[letter]) groupsByLetter[letter] = [];
      groupsByLetter[letter].push(pred);
    }
  });

  const predictedThirds: Array<{ team: string; group: string; stats: TeamStats }> = [];
  const realThirds: Array<{ team: string; group: string; stats: TeamStats }> = [];

  for (const [letter, preds] of Object.entries(groupsByLetter)) {
    const groupMatches = preds.map(p => ({ prediction: p, match: p.match }));
    const predicted = calculateGroupStandings(groupMatches, true);
    const real = calculateGroupStandings(groupMatches, false);

    if (predicted[2]) predictedThirds.push({ team: predicted[2].team, group: letter, stats: predicted[2] });
    if (real[2]) realThirds.push({ team: real[2].team, group: letter, stats: real[2] });
  }

  const sortThirds = (thirds: typeof realThirds) =>
    [...thirds].sort((a, b) => {
      if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
      if (b.stats.goalDifference !== a.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
      return b.stats.goalsFor - a.stats.goalsFor;
    }).slice(0, 8);

  const top8Predicted = sortThirds(predictedThirds);
  const top8Real = sortThirds(realThirds);
  const realBestThirdsTeams = top8Real.map(t => t.team);

  for (const predictedThird of top8Predicted) {
    if (realBestThirdsTeams.includes(predictedThird.team)) {
      points += POINTS.QUALIFICATION.TEAM_QUALIFIES;

      // Posición exacta: acertó que ese equipo quedaría 3º en su grupo
      const realThird = realThirds.find(t => t.group === predictedThird.group);
      if (realThird && realThird.team === predictedThird.team) {
        points += POINTS.QUALIFICATION.CORRECT_POSITION;
      }
    }
  }

  return points;
}

// --- Actualizar puntos de una entry ---

export async function updateEntryPoints(entryId: number): Promise<number> {
  const predictions = await prisma.prediction.findMany({
    where: { entryId },
    include: { match: true },
  });

  let total = 0;

  for (const pred of predictions) {
    total += calculateMatchPoints(pred, pred.match);
  }

  total += await calculateGroupQualificationPoints(entryId);
  total += await calculateBestThirdsPoints(entryId);

  if (ACTUAL_PICHICHI) {
    const entry = await prisma.entry.findUnique({ where: { id: entryId } });
    if (entry?.pichichi && entry.pichichi.trim().toLowerCase() === ACTUAL_PICHICHI.trim().toLowerCase()) {
      total += POINTS.PICHICHI;
    }
  }

  await prisma.entry.update({
    where: { id: entryId },
    data: { totalPoints: total },
  });

  return total;
}

export async function updateAllPorraPoints(porraId: number): Promise<void> {
  const entries = await prisma.entry.findMany({
    where: { porraId },
    select: { id: true },
  });

  for (const entry of entries) {
    await updateEntryPoints(entry.id);
  }
}
