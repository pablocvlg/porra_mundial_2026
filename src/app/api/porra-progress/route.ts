import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { calculateMatchPoints } from "../../../../lib/points";

type PredWithMatch = {
  matchId: number;
  homeGoals: number;
  awayGoals: number;
  homeTeam: string | null;
  awayTeam: string | null;
  penaltyWinner: string | null;
  match: {
    id: number;
    phase: string;
    group: string | null;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number | null;
    awayGoals: number | null;
    isFinished: boolean;
    matchOrder: number;
  };
};

type StandingsRow = { team: string; points: number; gd: number; gf: number; ga: number };

function groupStandings(preds: PredWithMatch[], usePrediction: boolean): StandingsRow[] {
  const stats: Record<string, StandingsRow> = {};
  preds.forEach(pred => {
    const h = pred.match.homeTeam;
    const a = pred.match.awayTeam;
    [h, a].forEach(t => { if (!stats[t]) stats[t] = { team: t, points: 0, gd: 0, gf: 0, ga: 0 }; });
    const hg = usePrediction ? pred.homeGoals : (pred.match.homeGoals ?? 0);
    const ag = usePrediction ? pred.awayGoals : (pred.match.awayGoals ?? 0);
    stats[h].gf += hg; stats[h].ga += ag;
    stats[a].gf += ag; stats[a].ga += hg;
    if (hg > ag) stats[h].points += 3;
    else if (hg < ag) stats[a].points += 3;
    else { stats[h].points += 1; stats[a].points += 1; }
  });
  Object.values(stats).forEach(s => { s.gd = s.gf - s.ga; });
  return Object.values(stats).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
}

// Calcula TODOS los puntos de clasificación de una vez.
// Solo devuelve > 0 cuando todos los grupos han terminado (allGroupsFinished).
function calcQualificationPoints(groupPreds: PredWithMatch[], allGroupsFinished: boolean): number {
  if (!allGroupsFinished) return 0;

  let points = 0;

  const byLetter: Record<string, PredWithMatch[]> = {};
  groupPreds.forEach(p => {
    if (p.match.group) {
      if (!byLetter[p.match.group]) byLetter[p.match.group] = [];
      byLetter[p.match.group].push(p);
    }
  });

  type ThirdEntry = { team: string; group: string; points: number; gd: number; gf: number };
  const predictedThirds: ThirdEntry[] = [];
  const realThirds: ThirdEntry[] = [];

  for (const [letter, gPreds] of Object.entries(byLetter)) {
    const predicted = groupStandings(gPreds, true);
    const real = groupStandings(gPreds, false);
    const realTop2 = real.slice(0, 2).map(s => s.team);

    // Puntos por 1º y 2º
    for (let pos = 0; pos < 2; pos++) {
      const predTeam = predicted[pos]?.team;
      if (!predTeam) continue;
      if (realTop2.includes(predTeam)) {
        points += 4; // TEAM_QUALIFIES
        if (predTeam === real[pos]?.team) points += 3; // CORRECT_POSITION
      }
    }

    // Recoge terceros para calcular mejores terceros
    const pred3 = predicted[2];
    const real3 = real[2];
    if (pred3) predictedThirds.push({ team: pred3.team, group: letter, points: pred3.points, gd: pred3.gd, gf: pred3.gf });
    if (real3) realThirds.push({ team: real3.team, group: letter, points: real3.points, gd: real3.gd, gf: real3.gf });
  }

  // Mejores terceros
  const sortThirds = (t: ThirdEntry[]) =>
    [...t].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf).slice(0, 8);

  const top8Pred = sortThirds(predictedThirds);
  const top8Real = sortThirds(realThirds);
  const realTeams = top8Real.map(t => t.team);

  for (const pt of top8Pred) {
    if (!realTeams.includes(pt.team)) continue;
    const rt = realThirds.find(t => t.group === pt.group);
    if (rt && rt.team === pt.team) points += 7; // TEAM_QUALIFIES + CORRECT_POSITION
    else points += 4; // solo TEAM_QUALIFIES
  }

  return points;
}

export async function GET(request: NextRequest) {
  const porraName = request.nextUrl.searchParams.get("porraName");
  if (!porraName) return NextResponse.json({ error: "Falta porraName" }, { status: 400 });

  const porra = await prisma.porra.findFirst({ where: { name: porraName } });
  if (!porra) return NextResponse.json({ error: "Porra no encontrada" }, { status: 404 });

  const [allMatchesRaw, allEntries] = await Promise.all([
    prisma.match.findMany({}),
    prisma.entry.findMany({
      where: { porraId: porra.id },
      include: { predictions: { include: { match: true } } },
      orderBy: [{ totalPoints: "desc" }, { participantName: "asc" }],
    }),
  ]);

  const allMatches = allMatchesRaw.sort((a, b) => {
    const ta = a.scheduledAt ? a.scheduledAt.getTime() : a.matchOrder * 1e12;
    const tb = b.scheduledAt ? b.scheduledAt.getTime() : b.matchOrder * 1e12;
    return ta - tb;
  });

  const groupMatches = allMatches.filter(m => m.phase === "Group");
  const knockoutMatches = allMatches.filter(m => m.phase !== "Group");
  const allGroupsFinished = groupMatches.length > 0 && groupMatches.every(m => m.isFinished);

  // Índice del punto "Clasificación" en el eje X (justo después de todos los partidos de grupo)
  const qualificationIndex = groupMatches.length;

  const xLabels = [
    ...groupMatches.map((_, i) => `G${i + 1}`),
    "Clasificación",
    ...knockoutMatches.map((_, i) => `E${i + 1}`),
  ];

  const entries = allEntries.map(entry => {
    const predMap = new Map(entry.predictions.map(p => [p.matchId, p]));
    const groupPreds = entry.predictions.filter(p => p.match.phase === "Group") as PredWithMatch[];
    const cumulativePoints: number[] = [];
    let running = 0;

    for (const match of groupMatches) {
      const pred = predMap.get(match.id);
      if (pred && match.isFinished) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        running += calculateMatchPoints(pred as any, match as any);
      }
      cumulativePoints.push(running);
    }

    // Punto de clasificación: todos los puntos de pase de ronda caen aquí
    running += calcQualificationPoints(groupPreds, allGroupsFinished);
    cumulativePoints.push(running);

    for (const match of knockoutMatches) {
      const pred = predMap.get(match.id);
      if (pred && match.isFinished) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        running += calculateMatchPoints(pred as any, match as any);
      }
      cumulativePoints.push(running);
    }

    return {
      entryId: entry.id,
      participantName: entry.participantName,
      totalPoints: entry.totalPoints,
      cumulativePoints,
    };
  });

  return NextResponse.json({
    xLabels,
    qualificationIndex,
    allGroupsFinished,
    entries,
  });
}
