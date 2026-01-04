"use client";

import { useState } from "react";

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  phase: string;
  group?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
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
  const [porraData, setPorraData] = useState<PorraStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!porraName) {
      setError("Debes introducir el nombre de la porra");
      return;
    }

    setLoading(true);
    setError("");
    setPorraData(null);
    setSelectedParticipantId(null);

    try {
      const params = new URLSearchParams({
        porraName,
      });

      const res = await fetch(`/api/porra-status?${params}`);
      const data = await res.json();

      if (res.ok) {
        setPorraData(data);
        // No seleccionar ningún participante por defecto
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

  const handleReset = () => {
    setPorraData(null);
    setPorraName("");
    setSelectedParticipantId(null);
    setError("");
  };

  const groupPredictionsByPhase = (predictions: Prediction[]) => {
    const grouped: Record<string, Prediction[]> = {};
    predictions.forEach(pred => {
      const phase = pred.match.phase;
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(pred);
    });
    return grouped;
  };

  const selectedEntry = porraData?.allEntries.find(e => e.id === selectedParticipantId);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Estado de la Porra</h1>

        {/* Buscador o Botón de Reset */}
        {!porraData ? (
          <div className="bg-gray-900 rounded-lg shadow-md p-6 mb-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Buscar Porra</h2>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block font-semibold mb-1">Nombre de la porra:</label>
                <input
                  type="text"
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Porra Oficina 2026"
                  value={porraName}
                  onChange={e => setPorraName(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div className="flex items-end">
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-600 h-[42px]"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-900 border border-red-700 text-red-200 p-3 rounded">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <button
              className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-700 border border-gray-700"
              onClick={handleReset}
            >
              ← Buscar otra porra diferente
            </button>
          </div>
        )}

        {/* Resultados */}
        {porraData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clasificación */}
            <div className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800">
              <h2 className="text-2xl font-semibold mb-4">
                Clasificación - {porraData.porra.name}
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="p-3 text-left">Pos</th>
                      <th className="p-3 text-left">Participante</th>
                      <th className="p-3 text-center">Puntos</th>
                      <th className="p-3 text-center">Exactos</th>
                      <th className="p-3 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porraData.allEntries.map((entry, index) => (
                      <tr 
                        key={entry.id} 
                        className={`border-b border-gray-800 cursor-pointer transition ${
                          selectedParticipantId === entry.id 
                            ? "bg-gray-800 ring-2 ring-blue-500" 
                            : "bg-gray-900 hover:bg-gray-800"
                        }`}
                        onClick={() => setSelectedParticipantId(entry.id)}
                      >
                        <td className="p-3 font-semibold">
                          {index === 0 && "🥇"}
                          {index === 1 && "🥈"}
                          {index === 2 && "🥉"}
                          {index > 2 && index + 1}
                        </td>
                        <td className="p-3">
                          {entry.participantName}
                        </td>
                        <td className="p-3 text-center font-bold">0</td>
                        <td className="p-3 text-center text-green-400">0</td>
                        <td className="p-3 text-center text-blue-400">0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {porraData.allEntries.length === 0 && (
                <p className="text-gray-400 text-center py-4">
                  Aún no hay participantes en esta porra
                </p>
              )}

              <div className="mt-4 p-3 bg-gray-800 rounded text-sm border border-gray-700">
                <p className="font-semibold mb-1">Leyenda:</p>
                <ul className="space-y-1 text-gray-300">
                  <li><span className="font-semibold">Puntos:</span> Puntuación total acumulada</li>
                  <li><span className="font-semibold text-green-400">Exactos:</span> Predicciones con resultado exacto</li>
                  <li><span className="font-semibold text-blue-400">Resultado:</span> Predicciones con ganador/empate correcto</li>
                </ul>
              </div>
            </div>

            {/* Predicciones */}
            <div className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800">
              <div className="mb-4">
                <label className="block font-semibold mb-2">Ver predicciones de:</label>
                <select
                  className="border border-gray-700 bg-gray-800 text-white p-2 w-full rounded focus:outline-none focus:border-blue-500"
                  value={selectedParticipantId || ""}
                  onChange={e => setSelectedParticipantId(Number(e.target.value))}
                >
                  <option value="">-- Selecciona un participante --</option>
                  {porraData.allEntries.map(entry => (
                    <option key={entry.id} value={entry.id}>
                      {entry.participantName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEntry && (
                <>
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-900 to-purple-900 rounded border border-blue-700">
                    <p className="font-semibold text-lg">{selectedEntry.participantName}</p>
                    <p className="text-sm text-gray-300">Pichichi: <span className="font-semibold">{selectedEntry.pichichi}</span></p>
                  </div>

                  <div className="max-h-[600px] overflow-y-auto">
                    {Object.entries(groupPredictionsByPhase(selectedEntry.predictions)).map(([phase, preds]) => (
                      <div key={phase} className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 text-gray-300 border-b border-gray-700 pb-2 sticky top-0 bg-gray-900">
                          {phase}
                        </h3>
                        
                        <div className="space-y-2">
                          {preds.map(pred => (
                            <div 
                              key={pred.id} 
                              className="flex items-center justify-between p-3 bg-gray-800 rounded hover:bg-gray-700 transition"
                            >
                              <div className="flex items-center space-x-4 flex-1">
                                <span className="w-2/5 text-right text-sm">{pred.match.homeTeam}</span>
                                <div className="flex items-center space-x-2 font-bold text-lg bg-gray-900 px-3 py-1 rounded shadow-sm">
                                  <span className="w-6 text-center">{pred.homeGoals}</span>
                                  <span className="text-gray-500">-</span>
                                  <span className="w-6 text-center">{pred.awayGoals}</span>
                                </div>
                                <span className="w-2/5 text-sm">{pred.match.awayTeam}</span>
                              </div>
                              
                              {pred.match.homeGoals !== null && pred.match.awayGoals !== null && (
                                <div className="ml-4 text-sm bg-green-900 border border-green-700 px-2 py-1 rounded">
                                  <span className="text-green-300 font-semibold">
                                    {pred.match.homeGoals}-{pred.match.awayGoals}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!selectedEntry && porraData.allEntries.length > 0 && (
                <p className="text-gray-400 text-center py-8">
                  Selecciona un participante para ver sus predicciones
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}