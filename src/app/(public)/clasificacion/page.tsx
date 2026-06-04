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
  penaltyWinner?: string | null;
  isFinished: boolean;
};

type Prediction = {
  id: number;
  matchId: number;
  homeGoals: number;
  awayGoals: number;
  homeTeam?: string | null;
  awayTeam?: string | null;
  penaltyWinner?: string | null;
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
  porra: { id: number; name: string };
  allEntries: Entry[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMatchWinner(
  homeTeam: string, awayTeam: string,
  homeGoals: number, awayGoals: number,
  penaltyWinner: string | null | undefined
): string | null {
  if (homeGoals > awayGoals) return homeTeam;
  if (awayGoals > homeGoals) return awayTeam;
  if (penaltyWinner === "home") return homeTeam;
  if (penaltyWinner === "away") return awayTeam;
  return null;
}

function normalizePhase(phase: string): string {
  if (phase === "Quarter-final") return "Quarterfinal";
  if (phase === "Semi-final") return "Semifinal";
  return phase;
}

const KNOCKOUT_PHASES: Array<{ key: string; label: string; advPts: number }> = [
  { key: "Round of 32",  label: "Pasan a octavos",  advPts: 5 },
  { key: "Round of 16",  label: "Pasan a cuartos",  advPts: 6 },
  { key: "Quarterfinal", label: "Pasan a semis",    advPts: 7 },
  { key: "Semifinal",    label: "Pasan a la final", advPts: 8 },
  { key: "Third Place",  label: "Tercer puesto",    advPts: 3 },
];

// ─── Standings (sin tiebreakers complejos) ────────────────────────────────────

function calculateGroupStandings(
  groupPredictions: Prediction[],
  usePrediction: boolean
): Array<{ team: string; points: number; gd: number; gf: number }> {
  const stats: Record<string, { team: string; points: number; gd: number; gf: number; ga: number }> = {};

  groupPredictions.forEach(pred => {
    const homeTeam = pred.match.homeTeam;
    const awayTeam = pred.match.awayTeam;
    if (!homeTeam || !awayTeam) return;
    [homeTeam, awayTeam].forEach(t => {
      if (!stats[t]) stats[t] = { team: t, points: 0, gd: 0, gf: 0, ga: 0 };
    });
    const hg = usePrediction ? pred.homeGoals : (pred.match.homeGoals ?? 0);
    const ag = usePrediction ? pred.awayGoals : (pred.match.awayGoals ?? 0);
    stats[homeTeam].gf += hg; stats[homeTeam].ga += ag;
    stats[awayTeam].gf += ag; stats[awayTeam].ga += hg;
    if (hg > ag) { stats[homeTeam].points += 3; }
    else if (hg < ag) { stats[awayTeam].points += 3; }
    else { stats[homeTeam].points += 1; stats[awayTeam].points += 1; }
  });

  Object.values(stats).forEach(s => { s.gd = s.gf - s.ga; });
  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
}

// ─── calculateStats ───────────────────────────────────────────────────────────

function calculateStats(entry: Entry) {
  const groupPreds = entry.predictions.filter(p => p.match.phase === "Group");
  const knockoutPreds = entry.predictions.filter(p => p.match.phase !== "Group");

  // ── Grupos: partidos ──────────────────────────────────────────────────────
  let finishedGroupMatches = 0;
  let correct1X2 = 0;
  let exactMatches = 0;
  let exactScoreExtraPoints = 0;
  let groupMatchPoints = 0;
  let maxGroupMatchPoints = 0;

  for (const pred of groupPreds) {
    const m = pred.match;
    if (!m.isFinished || m.homeGoals == null || m.awayGoals == null) continue;
    finishedGroupMatches++;
    const totalGoals = m.homeGoals + m.awayGoals;
    maxGroupMatchPoints += 3 + 2 + Math.max(0, totalGoals - 2);

    const predW = pred.homeGoals > pred.awayGoals ? "h" : pred.awayGoals > pred.homeGoals ? "a" : "d";
    const matchW = m.homeGoals > m.awayGoals ? "h" : m.awayGoals > m.homeGoals ? "a" : "d";

    if (predW === matchW) { correct1X2++; groupMatchPoints += 3; }
    if (pred.homeGoals === m.homeGoals && pred.awayGoals === m.awayGoals) {
      exactMatches++;
      const extra = Math.max(0, totalGoals - 2);
      exactScoreExtraPoints += extra;
      groupMatchPoints += 2 + extra;
    }
  }

  // ── Clasificación: 1º y 2º por grupo ──────────────────────────────────────
  const groupsByLetter: Record<string, Prediction[]> = {};
  groupPreds.forEach(p => {
    if (p.match.group) {
      if (!groupsByLetter[p.match.group]) groupsByLetter[p.match.group] = [];
      groupsByLetter[p.match.group].push(p);
    }
  });

  let finishedGroups = 0;
  const totalGroups = Object.keys(groupsByLetter).length;
  let qualifiedWithPos = 0;
  let qualifiedNoPos = 0;
  let qualificationPoints = 0;
  let maxQualificationPoints = 0;

  for (const gPreds of Object.values(groupsByLetter)) {
    if (!gPreds.every(p => p.match.isFinished)) continue;
    finishedGroups++;
    maxQualificationPoints += 14; // 2 posiciones × (4+3)

    const predicted = calculateGroupStandings(gPreds, true);
    const real = calculateGroupStandings(gPreds, false);
    const realTop2 = real.slice(0, 2).map(s => s.team);

    for (let pos = 0; pos < 2; pos++) {
      const predTeam = predicted[pos]?.team;
      if (!predTeam) continue;
      if (realTop2.includes(predTeam)) {
        if (predTeam === real[pos]?.team) { qualifiedWithPos++; qualificationPoints += 7; }
        else { qualifiedNoPos++; qualificationPoints += 4; }
      }
    }
  }

  // ── Mejores terceros ───────────────────────────────────────────────────────
  const allGroupsDone = finishedGroups === totalGroups && totalGroups > 0;
  let bestThirdWithPos = 0;
  let bestThirdNoPos = 0;
  let bestThirdPoints = 0;
  const maxBestThirdPoints = allGroupsDone ? 56 : 0; // 8 × (4+3)

  if (allGroupsDone) {
    type ThirdEntry = { team: string; group: string; points: number; gd: number; gf: number };
    const predictedThirds: ThirdEntry[] = [];
    const realThirds: ThirdEntry[] = [];

    for (const [letter, gPreds] of Object.entries(groupsByLetter)) {
      const pred3 = calculateGroupStandings(gPreds, true)[2];
      const real3 = calculateGroupStandings(gPreds, false)[2];
      if (pred3) predictedThirds.push({ team: pred3.team, group: letter, points: pred3.points, gd: pred3.gd, gf: pred3.gf });
      if (real3) realThirds.push({ team: real3.team, group: letter, points: real3.points, gd: real3.gd, gf: real3.gf });
    }

    const sortThirds = (t: ThirdEntry[]) =>
      [...t].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf).slice(0, 8);

    const top8Pred = sortThirds(predictedThirds);
    const top8Real = sortThirds(realThirds);
    const realTeams = top8Real.map(t => t.team);

    for (const pt of top8Pred) {
      if (!realTeams.includes(pt.team)) continue;
      const rt = realThirds.find(t => t.group === pt.group);
      if (rt && rt.team === pt.team) { bestThirdWithPos++; bestThirdPoints += 7; }
      else { bestThirdNoPos++; bestThirdPoints += 4; }
    }
  }

  // ── Eliminatorias ──────────────────────────────────────────────────────────
  const knockoutByPhase: Record<string, { correct: number; finished: number; advPts: number }> = {};
  KNOCKOUT_PHASES.forEach(({ key, advPts }) => {
    knockoutByPhase[key] = { correct: 0, finished: 0, advPts };
  });

  let cruce1x2Bonus = 0;
  let knockoutPoints = 0;
  let maxKnockoutPoints = 0;
  let bothFinalists = false;
  let championCorrect = false;
  let finalPoints = 0;
  let finalDone = false;

  for (const pred of knockoutPreds) {
    const m = pred.match;
    if (!m.isFinished || m.homeGoals == null || m.awayGoals == null) continue;
    if (!pred.homeTeam || !pred.awayTeam) continue;

    const phase = normalizePhase(m.phase);
    const actualWinner = getMatchWinner(m.homeTeam, m.awayTeam, m.homeGoals, m.awayGoals, m.penaltyWinner);
    const predictedWinner = getMatchWinner(pred.homeTeam, pred.awayTeam, pred.homeGoals, pred.awayGoals, pred.penaltyWinner);

    if (phase === "Final") {
      finalDone = true;
      const bothCorrect =
        (pred.homeTeam === m.homeTeam && pred.awayTeam === m.awayTeam) ||
        (pred.homeTeam === m.awayTeam && pred.awayTeam === m.homeTeam);
      if (bothCorrect) { bothFinalists = true; finalPoints += 4; }
      if (predictedWinner && predictedWinner === actualWinner) { championCorrect = true; finalPoints += 10; }
      continue;
    }

    const phaseData = knockoutByPhase[phase];
    if (!phaseData) continue;
    phaseData.finished++;
    maxKnockoutPoints += phaseData.advPts + 1; // avance + max bonus cruce (solo 1X2)

    if (predictedWinner && predictedWinner === actualWinner) {
      phaseData.correct++;
      knockoutPoints += phaseData.advPts;
    }

    // Bonus por cruce exacto (solo 1X2)
    const normalOrder = pred.homeTeam === m.homeTeam && pred.awayTeam === m.awayTeam;
    const reverseOrder = pred.homeTeam === m.awayTeam && pred.awayTeam === m.homeTeam;
    if (normalOrder || reverseOrder) {
      if (predictedWinner && predictedWinner === actualWinner) {
        cruce1x2Bonus++; knockoutPoints++;
      }
    }
  }

  const maxFinalPoints = finalDone ? 14 : 0;
  const totalCalculado = groupMatchPoints + qualificationPoints + bestThirdPoints + knockoutPoints + finalPoints;
  const maxPosible = maxGroupMatchPoints + maxQualificationPoints + maxBestThirdPoints + maxKnockoutPoints + maxFinalPoints;

  return {
    // Grupos partidos
    finishedGroupMatches, totalGroupMatches: groupPreds.length,
    correct1X2, exactMatches, exactScoreExtraPoints, groupMatchPoints, maxGroupMatchPoints,
    // Clasificación
    finishedGroups, totalGroups,
    qualifiedWithPos, qualifiedNoPos, qualificationPoints, maxQualificationPoints,
    // Mejores terceros
    allGroupsDone, bestThirdWithPos, bestThirdNoPos, bestThirdPoints, maxBestThirdPoints,
    // Eliminatorias
    knockoutByPhase, cruce1x2Bonus, knockoutPoints, maxKnockoutPoints,
    // Final
    bothFinalists, championCorrect, finalPoints, finalDone, maxFinalPoints,
    // Totales
    totalCalculado, maxPosible,
  };
}

// ─── Componente auxiliar de fila de desglose ──────────────────────────────────

function DesgloseFila({
  label, value, pts, color = "text-gray-200",
}: { label: string; value?: string; pts: number | string; color?: string }) {
  return (
    <div className="flex justify-between items-center px-2 py-1 bg-gray-700/40 rounded text-xs">
      <span className="text-gray-300">{label}{value ? <span className="text-gray-500 ml-1">({value})</span> : ""}</span>
      <span className={`font-semibold ${color} tabular-nums`}>{typeof pts === "number" ? `+${pts} pts` : pts}</span>
    </div>
  );
}

function DesgloseSeccion({ title, children, subtotal, maxSub }: {
  title: string; children: React.ReactNode; subtotal: number; maxSub: number;
}) {
  return (
    <div>
      <h4 className="font-bold text-gray-400 uppercase tracking-wide text-xs mb-1">{title}</h4>
      <div className="space-y-0.5 mb-1">{children}</div>
      <div className="flex justify-between items-center px-2 py-1 bg-gray-800/60 border border-gray-600 rounded text-xs">
        <span className="text-gray-400">Subtotal</span>
        <span className="font-bold text-white tabular-nums">
          {subtotal} pts
          {maxSub > 0 && <span className="text-gray-500 font-normal ml-1">/ {maxSub} max</span>}
        </span>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

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
      .then((data: { name: string }[]) => setPorraOptions(data.map(p => p.name)));
  }, []);

  const handleSearch = async (name: string) => {
    if (!name) { setPorraData(null); return; }
    setLoading(true); setError(""); setPorraData(null);
    setSelectedParticipantId(null); setExpandedRowId(null);
    try {
      const res = await fetch(`/api/porra-status?${new URLSearchParams({ porraName: name })}`);
      const data = await res.json();
      if (res.ok) setPorraData(data);
      else setError(data.error || "Error al cargar la porra");
    } catch { setError("Error al conectar con el servidor"); }
    finally { setLoading(false); }
  };

  const handleSelectChange = (name: string) => { setPorraName(name); handleSearch(name); };
  const handleRowClick = (id: number) => setExpandedRowId(expandedRowId === id ? null : id);

  const translatePhase = (phase: string): string => {
    const map: Record<string, string> = {
      "Group":         "Fase de grupos",
      "Round of 32":   "Dieciseisavos de final",
      "Round of 16":   "Octavos de final",
      "Quarter-final": "Cuartos de final",
      "Quarterfinal":  "Cuartos de final",
      "Semi-final":    "Semifinales",
      "Semifinal":     "Semifinales",
      "Final":         "Final",
      "Third Place":   "3er y 4º puesto",
    };
    return map[phase] ?? phase;
  };

  const groupPredictionsByPhase = (predictions: Prediction[]) => {
    const grouped: Record<string, Prediction[]> = {};
    [...predictions].sort((a, b) => a.match.id - b.match.id).forEach(pred => {
      const phase = pred.match.phase;
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(pred);
    });
    return grouped;
  };

  const selectedEntry = porraData?.allEntries.find(e => e.id === selectedParticipantId);

  return (
    <div className="min-h-screen bg-black bg-fixed bg-no-repeat bg-center text-white pt-14"
      style={{ backgroundImage: `url('/background.avif')` }}>
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">Clasificación</h1>

        {/* Selector */}
        <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-lg p-4 mb-4">
          <div className="flex flex-col items-center">
            <label className="block font-semibold mb-1 text-sm w-4/5 md:w-1/3">Nombre de la porra:</label>
            <select
              className="border border-gray-700 bg-gray-800 text-white p-2 w-4/5 md:w-1/3 rounded text-sm focus:outline-none focus:border-blue-500"
              value={porraName}
              onChange={e => handleSelectChange(e.target.value)}
            >
              <option value="">-- Selecciona una porra --</option>
              {porraOptions.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          {error && <div className="mt-3 bg-red-900/50 border border-red-700 text-red-200 p-2 rounded text-sm text-center">{error}</div>}
          {loading && <p className="text-center text-gray-400 text-sm mt-3">Cargando...</p>}
        </div>

        {porraData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* ── Clasificación ── */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-lg shadow-md p-4 border border-gray-800/50">
              <p className="text-xs text-gray-400 mb-3">💡 Haz clic en un participante para ver el desglose de puntos.</p>
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
                      const pct = stats.maxPosible > 0 ? Math.round(stats.totalCalculado / stats.maxPosible * 100) : null;

                      return (
                        <>
                          <tr
                            key={entry.id}
                            className={`border-b border-gray-800 cursor-pointer transition ${
                              selectedParticipantId === entry.id ? "bg-gray-700 ring-2 ring-blue-500"
                              : isExpanded ? "bg-gray-700"
                              : "hover:bg-gray-800"
                            }`}
                            onClick={() => handleRowClick(entry.id)}
                          >
                            <td className="p-2 font-semibold">
                              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                            </td>
                            <td className="p-2 font-medium">{entry.participantName}</td>
                            <td className="p-2 text-center font-bold text-lg text-orange-400">{entry.totalPoints}</td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-gray-800/50">
                              <td colSpan={3} className="p-3">
                                <div className="space-y-3">

                                  {/* GRUPOS: partidos */}
                                  {stats.finishedGroupMatches > 0 && (
                                    <DesgloseSeccion
                                      title={`Fase de grupos · ${stats.finishedGroupMatches}/${stats.totalGroupMatches} partidos`}
                                      subtotal={stats.groupMatchPoints}
                                      maxSub={stats.maxGroupMatchPoints}
                                    >
                                      <DesgloseFila
                                        label="1X2 acertados"
                                        value={`${stats.correct1X2}/${stats.finishedGroupMatches}`}
                                        pts={stats.correct1X2 * 3}
                                        color="text-blue-300"
                                      />
                                      <DesgloseFila
                                        label="Resultados exactos"
                                        value={stats.exactScoreExtraPoints > 0
                                          ? `${stats.exactMatches}/${stats.finishedGroupMatches} · incl. ${stats.exactScoreExtraPoints} pts extra por goles`
                                          : `${stats.exactMatches}/${stats.finishedGroupMatches}`}
                                        pts={stats.groupMatchPoints - stats.correct1X2 * 3}
                                        color="text-green-300"
                                      />
                                    </DesgloseSeccion>
                                  )}

                                  {/* CLASIFICACIÓN */}
                                  {stats.finishedGroups > 0 && (() => {
                                    const totalCorrect = stats.qualifiedWithPos + stats.qualifiedNoPos + (stats.allGroupsDone ? stats.bestThirdWithPos + stats.bestThirdNoPos : 0);
                                    const totalWithExactPos = stats.qualifiedWithPos + (stats.allGroupsDone ? stats.bestThirdWithPos : 0);
                                    return (
                                      <DesgloseSeccion
                                        title={stats.allGroupsDone ? "Clasificación · 32 clasificados" : `Clasificación · ${stats.finishedGroups}/${stats.totalGroups} grupos`}
                                        subtotal={stats.qualificationPoints + stats.bestThirdPoints}
                                        maxSub={stats.maxQualificationPoints + stats.maxBestThirdPoints}
                                      >
                                        <DesgloseFila
                                          label="Clasificados acertados"
                                          value={String(totalCorrect)}
                                          pts={totalCorrect * 4}
                                          color="text-indigo-300"
                                        />
                                        <DesgloseFila
                                          label="Clasificados acertados con posición exacta"
                                          value={String(totalWithExactPos)}
                                          pts={totalWithExactPos * 3}
                                          color="text-purple-300"
                                        />
                                        {!stats.allGroupsDone && (
                                          <div className="px-2 py-1 text-xs text-gray-500 italic">
                                            Mejores terceros: pendiente de que terminen todos los grupos
                                          </div>
                                        )}
                                      </DesgloseSeccion>
                                    );
                                  })()}

                                  {/* ELIMINATORIAS */}
                                  {KNOCKOUT_PHASES.some(p => stats.knockoutByPhase[p.key]?.finished > 0) && (
                                    <DesgloseSeccion
                                      title="Eliminatorias"
                                      subtotal={stats.knockoutPoints}
                                      maxSub={stats.maxKnockoutPoints}
                                    >
                                      {KNOCKOUT_PHASES.map(({ key, label, advPts }) => {
                                        const d = stats.knockoutByPhase[key];
                                        if (!d || d.finished === 0) return null;
                                        return (
                                          <DesgloseFila
                                            key={key}
                                            label={`${label} · ${advPts} pts/equipo`}
                                            value={`${d.correct} de ${d.finished}`}
                                            pts={d.correct * advPts}
                                            color="text-yellow-300"
                                          />
                                        );
                                      })}
                                      <DesgloseFila
                                        label="Bonus cruce exacto · 1X2 acertado"
                                        value={`${stats.cruce1x2Bonus} partidos`}
                                        pts={stats.cruce1x2Bonus}
                                        color={stats.cruce1x2Bonus > 0 ? "text-orange-300" : "text-gray-500"}
                                      />
                                    </DesgloseSeccion>
                                  )}

                                  {/* FINAL */}
                                  {stats.finalDone && (
                                    <DesgloseSeccion
                                      title="Final"
                                      subtotal={stats.finalPoints}
                                      maxSub={stats.maxFinalPoints}
                                    >
                                      <DesgloseFila
                                        label={stats.bothFinalists ? "✓ Ambos finalistas acertados" : "✗ Ambos finalistas"}
                                        pts={stats.bothFinalists ? 4 : 0}
                                        color={stats.bothFinalists ? "text-green-300" : "text-red-400"}
                                      />
                                      <DesgloseFila
                                        label={stats.championCorrect ? "✓ Campeón del mundo acertado" : "✗ Campeón del mundo"}
                                        pts={stats.championCorrect ? 10 : 0}
                                        color={stats.championCorrect ? "text-green-300" : "text-red-400"}
                                      />
                                    </DesgloseSeccion>
                                  )}

                                  {/* PICHICHI */}
                                  <DesgloseSeccion
                                    title="Pichichi"
                                    subtotal={0}
                                    maxSub={5}
                                  >
                                    <DesgloseFila
                                      label={`Predicción: ${entry.pichichi || "—"}`}
                                      pts="Pendiente"
                                      color="text-gray-400"
                                    />
                                  </DesgloseSeccion>

                                  {/* TOTAL */}
                                  <div className="border-t border-gray-600 pt-2 space-y-1">
                                    <div className="flex justify-between items-center px-2 py-1.5 bg-gray-900/70 border border-gray-500 rounded text-xs">
                                      <span className="font-bold text-white">Total calculado</span>
                                      <span className="font-bold text-orange-400 tabular-nums text-sm">{stats.totalCalculado} pts</span>
                                    </div>
                                    {stats.maxPosible > 0 && (
                                      <div className="flex justify-between items-center px-2 py-1 text-xs text-gray-400">
                                        <span>Máximo posible hasta ahora</span>
                                        <span className="tabular-nums">
                                          {stats.maxPosible} pts
                                          {pct !== null && <span className="text-gray-500 ml-1">({pct}%)</span>}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedParticipantId(entry.id); }}
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

            {/* ── Predicciones ── */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-lg shadow-md p-4 border border-gray-800/50 lg:sticky lg:top-18">
              <div className="mb-3">
                <label className="block font-semibold mb-2 text-sm">Ver predicciones de:</label>
                <select
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded text-sm focus:outline-none focus:border-blue-500"
                  value={selectedParticipantId || ""}
                  onChange={e => setSelectedParticipantId(Number(e.target.value))}
                >
                  <option value="">-- Selecciona un participante --</option>
                  {porraData.allEntries.map(e => <option key={e.id} value={e.id}>{e.participantName}</option>)}
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
                        <h3 className="text-sm font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-1 sticky top-0">
                          {translatePhase(phase)}
                        </h3>
                        <div className="space-y-1">
                          {preds.map(pred => {
                            const m = pred.match;
                            const isGroup = m.phase === "Group";
                            const isFinished = m.isFinished && m.homeGoals != null && m.awayGoals != null;

                            // Lógica común: ganador predicho y real
                            const predHome = pred.homeTeam ?? m.homeTeam;
                            const predAway = pred.awayTeam ?? m.awayTeam;
                            const predWinner = pred.homeGoals > pred.awayGoals ? predHome
                              : pred.awayGoals > pred.homeGoals ? predAway
                              : pred.penaltyWinner === "home" ? predHome
                              : pred.penaltyWinner === "away" ? predAway
                              : null;
                            const predIsPen = pred.homeGoals === pred.awayGoals && pred.penaltyWinner != null;

                            let isExact = false, isCorrectWinner = false, isFailed = false;
                            let actualWinner: string | null = null;
                            let actualIsPen = false;
                            if (isFinished) {
                              const hg = m.homeGoals!; const ag = m.awayGoals!;
                              actualWinner = hg > ag ? m.homeTeam : ag > hg ? m.awayTeam
                                : m.penaltyWinner === "home" ? m.homeTeam
                                : m.penaltyWinner === "away" ? m.awayTeam : null;
                              actualIsPen = hg === ag && m.penaltyWinner != null;
                              if (isGroup) {
                                isExact = pred.homeGoals === hg && pred.awayGoals === ag;
                                const predW = pred.homeGoals > pred.awayGoals ? "h" : pred.awayGoals > pred.homeGoals ? "a" : "d";
                                const matchW = hg > ag ? "h" : ag > hg ? "a" : "d";
                                if (!isExact && predW === matchW) isCorrectWinner = true;
                                if (!isExact && !isCorrectWinner) isFailed = true;
                              } else {
                                isCorrectWinner = predWinner != null && predWinner === actualWinner;
                                isFailed = !isCorrectWinner;
                              }
                            }

                            return (
                              <div key={pred.id} className={`flex items-center justify-between p-2 rounded text-xs transition ${
                                isExact ? "bg-blue-900/30 border border-blue-700"
                                : isCorrectWinner ? "bg-green-900/30 border border-green-700"
                                : isFailed ? "bg-red-900/20 border border-red-900/50"
                                : "bg-gray-800 border border-gray-700"
                              }`}>
                                {isGroup ? (
                                  // Fase de grupos: mostrar marcador
                                  <div className="flex items-center space-x-2 flex-1 justify-end pr-8">
                                    <span className="w-24 text-right">{predHome}</span>
                                    <div className="flex items-center space-x-1 font-bold bg-gray-900 px-2 py-0.5 rounded flex-shrink-0">
                                      <span className="w-5 text-center">{pred.homeGoals}</span>
                                      <span className="text-gray-500">-</span>
                                      <span className="w-5 text-center">{pred.awayGoals}</span>
                                    </div>
                                    <span className="w-24">{predAway}</span>
                                  </div>
                                ) : (
                                  // Eliminatorias: ambos equipos, ganador en dorado y negrita
                                  <div className="flex items-center flex-1 gap-1 justify-end pr-16">
                                    <span className={`w-24 text-right ${predWinner === predHome ? "font-bold text-yellow-400" : "text-gray-500"}`}>
                                      {predIsPen && predWinner === predHome && <span className="text-yellow-400 font-bold mr-1">(P)</span>}{predHome}
                                    </span>
                                    <span className="text-gray-600 flex-shrink-0">-</span>
                                    <span className={`w-24 ${predWinner === predAway ? "font-bold text-yellow-400" : "text-gray-500"}`}>
                                      {predAway}{predIsPen && predWinner === predAway && <span className="text-yellow-400 font-bold ml-1">(P)</span>}
                                    </span>
                                  </div>
                                )}
                                <div className="ml-2 flex-shrink-0 w-28 flex items-center justify-end gap-1">
                                  {isFinished && (
                                    <>
                                      {isGroup ? (
                                        <div className="text-xs bg-gray-800 border border-gray-600 px-1.5 py-0.5 rounded">
                                          <span className="text-gray-300 font-semibold">{m.homeGoals}-{m.awayGoals}</span>
                                        </div>
                                      ) : (
                                        <div className="text-xs bg-gray-800 border border-gray-600 px-1.5 py-0.5 rounded max-w-[80px] truncate">
                                          <span className="font-semibold text-gray-300">
                                            {actualWinner ?? "—"}{actualIsPen && <span className="text-gray-400 font-normal ml-1">(P)</span>}
                                          </span>
                                        </div>
                                      )}
                                      {isExact && <span className="text-blue-400 font-bold">🏆</span>}
                                      {isCorrectWinner && <span className="text-green-400 font-bold">✓</span>}
                                      {isFailed && <span className="text-red-400 font-bold">✗</span>}
                                    </>
                                  )}
                                </div>
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
