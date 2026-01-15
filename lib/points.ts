import { prisma } from './prisma';
import { Match, Prediction } from '@prisma/client';

// Definir tus reglas de puntuación
const POINTS_RULES = {
  GROUP: {
    EXACT_SCORE: 3,
    CORRECT_WINNER_AND_DIFF: 2,
    CORRECT_WINNER: 1,
  },
  KNOCKOUT: {
    CORRECT_TEAMS: 2,
    EXACT_SCORE: 5,
    CORRECT_WINNER: 2,
    MULTIPLIER: {
      'Round of 16': 1,
      'Quarterfinals': 1.5,
      'Semifinals': 2,
      'Final': 3,
    }
  }
};

// Cambiar el tipo de los parámetros para usar los tipos de Prisma
export function calculateMatchPoints(
  prediction: Prediction,
  match: Match
): number {
  if (!match.isFinished || match.homeGoals === null || match.awayGoals === null) {
    return 0;
  }

  let points = 0;
  const isKnockout = match.phase !== 'Group';

  if (isKnockout) {
    // Puntos por acertar equipos
    if (prediction.homeTeam === match.homeTeam && prediction.awayTeam === match.awayTeam) {
      points += POINTS_RULES.KNOCKOUT.CORRECT_TEAMS;
    }
  }

  // Resultado exacto
  if (prediction.homeGoals === match.homeGoals && 
      prediction.awayGoals === match.awayGoals &&
      prediction.penaltyWinner === match.penaltyWinner) {
    
    points += isKnockout ? POINTS_RULES.KNOCKOUT.EXACT_SCORE : POINTS_RULES.GROUP.EXACT_SCORE;
    
  } else {
    // Acertar ganador
    const predWinner = prediction.penaltyWinner || 
      (prediction.homeGoals > prediction.awayGoals ? 'home' : 
       prediction.awayGoals > prediction.homeGoals ? 'away' : 'draw');
    
    const matchWinner = match.penaltyWinner || 
      (match.homeGoals > match.awayGoals ? 'home' : 
       match.awayGoals > match.homeGoals ? 'away' : 'draw');

    if (predWinner === matchWinner) {
      if (!isKnockout) {
        // Fase de grupos: check diferencia de goles
        const predDiff = Math.abs(prediction.homeGoals - prediction.awayGoals);
        const matchDiff = Math.abs(match.homeGoals - match.awayGoals);
        
        if (predDiff === matchDiff) {
          points += POINTS_RULES.GROUP.CORRECT_WINNER_AND_DIFF;
        } else {
          points += POINTS_RULES.GROUP.CORRECT_WINNER;
        }
      } else {
        points += POINTS_RULES.KNOCKOUT.CORRECT_WINNER;
      }
    }
  }

  // Aplicar multiplicador en knockout
  if (isKnockout && points > 0) {
    const multiplier = POINTS_RULES.KNOCKOUT.MULTIPLIER[match.phase as keyof typeof POINTS_RULES.KNOCKOUT.MULTIPLIER] || 1;
    points *= multiplier;
  }

  return points;
}

export async function updateEntryPoints(entryId: number) {
  const predictions = await prisma.prediction.findMany({
    where: { entryId },
    include: { match: true }
  });

  let totalPoints = 0;
  for (const pred of predictions) {
    totalPoints += calculateMatchPoints(pred, pred.match);
  }

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