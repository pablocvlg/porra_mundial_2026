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
};

export default function PorraPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [pichichi, setPichichi] = useState("");
  const [predictions, setPredictions] = useState<Record<number, { homeGoals: number; awayGoals: number }>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/matches")
      .then(res => res.json())
      .then((data: Match[]) => {
        setMatches(data);
      });
  }, []);

  const handlePredictionChange = (matchId: number, field: "homeGoals" | "awayGoals", value: number) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!participantName || !pichichi) {
      setMessage("Debes introducir tu nombre y tu pichichi");
      return;
    }

    // Validar que todas las predicciones estén completas
    for (const match of matches) {
      if (!predictions[match.id] || predictions[match.id].homeGoals === undefined || predictions[match.id].awayGoals === undefined) {
        setMessage("Debes rellenar todos los partidos");
        return;
      }
    }

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName,
          porraId: 1, // Ajusta al ID de la porra que corresponda
          pichichi,
          predictions: matches.map(match => ({
            matchId: match.id,
            homeGoals: predictions[match.id].homeGoals,
            awayGoals: predictions[match.id].awayGoals,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Porra enviada correctamente!");
      } else {
        setMessage(data.error || "Error al enviar la porra");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error al enviar la porra");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Formulario de Porra Mundial 2026</h1>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Nombre del participante:</label>
        <input
          type="text"
          className="border p-2 w-full"
          value={participantName}
          onChange={e => setParticipantName(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Pichichi:</label>
        <input
          type="text"
          className="border p-2 w-full"
          value={pichichi}
          onChange={e => setPichichi(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Predicciones de partidos</h2>
        {matches.map(match => (
          <div key={match.id} className="flex items-center space-x-4 mb-2">
            <span className="w-1/3">{match.homeTeam}</span>
            <input
              type="number"
              min={0}
              className="border p-1 w-12 text-center"
              placeholder="0"
              value={predictions[match.id]?.homeGoals ?? ""}
              onChange={e => handlePredictionChange(match.id, "homeGoals", Number(e.target.value))}
            />
            <span> - </span>
            <input
              type="number"
              min={0}
              className="border p-1 w-12 text-center"
              placeholder="0"
              value={predictions[match.id]?.awayGoals ?? ""}
              onChange={e => handlePredictionChange(match.id, "awayGoals", Number(e.target.value))}
            />
            <span className="w-1/3 text-right">{match.awayTeam}</span>
          </div>
        ))}
      </div>

      {message && <div className="mb-4 text-red-600 font-semibold">{message}</div>}

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleSubmit}
      >
        Enviar Porra
      </button>
    </div>
  );
}