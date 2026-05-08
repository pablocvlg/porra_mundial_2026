"use client";
import { useState } from "react";
export default function ReglasButton() {
  const [showReglas, setShowReglas] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowReglas(true)}
        className="cursor-pointer absolute top-18 right-6 z-40 bg-amber-700 hover:bg-amber-600 text-white pt-2 pr-4 pb-2 pl-3 rounded-lg shadow-lg flex items-center justify-center gap-2 font-bold text-sm transition-colors duration-200"
      >
        📜 REGLAS
      </button>
      {showReglas && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">📜 Reglas</h2>
              <button
                onClick={() => setShowReglas(false)}
                className="cursor-pointer text-red-500 hover:text-red-400 text-2xl leading-none font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-white text-sm leading-relaxed space-y-6">
  <div className="mb-3">
    <h3 className="text-amber-400 font-bold text-base mb-2">
      ⚽ Fase de grupos
    </h3>
    <ul className="list-disc pl-5 space-y-2">
      <li>
        Acertar <span className="font-semibold">1X2</span> de un partido:
        <span className="text-green-400 font-bold"> +3 puntos</span>
      </li>
      <li>
        Acertar un <span className="font-semibold">resultado exacto</span>:
        <span className="text-green-400 font-bold"> +2 puntos,</span>
        {" "}<span className="text-red-400 font-bold">+1 punto extra</span> por cada gol por encima de 2.
        <br />
        <span className="text-gray-400 text-xs">
          Ejemplos: 2-1 = +1 extra, 4-0 = +2 extra...
        </span>
      </li>
      <li>
        Acertar un equipo que pasa a{" "}
        <span className="font-semibold">dieciseisavos</span>:
        <span className="text-green-400 font-bold"> +4 puntos,</span>
        {" "}<span className="text-red-400 font-bold">+3 puntos extra</span> por acertar la{" "}
        <span className="font-semibold">
          posición exacta 
        </span>{" "}
        en la que un equipo clasifica (incluyendo los 8 mejores terceros).
      </li>
    </ul>
  </div>
  <div className="mb-3">
    <h3 className="text-amber-400 font-bold text-base mb-2">
      ⚔️ Eliminatorias
    </h3>
    <ul className="list-disc pl-5 space-y-2">
      <li>
        Para todas las rondas eliminatorias menos la final, si por los resultados que se han puesto se acierta un{" "}
        <span className="font-semibold">cruce exacto</span> de dos equipos:
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>
            <span className="text-red-400 font-bold">+1 punto extra</span> por acertar {" "}
            <span className="font-semibold">1X2</span>
          </li>
          <li>
            <span className="text-red-400 font-bold">+1 punto extra</span> por acertar el{" "}
            <span className="font-semibold">resultado exacto</span>{" "}
            (sin contar penaltis)
          </li>
        </ul>
      </li>

      <li>
        Acertar equipo que pasa a octavos:
        <span className="text-green-400 font-bold"> +5 puntos</span>
      </li>

      <li>
        Acertar equipo que pasa a cuartos:
        <span className="text-green-400 font-bold"> +6 puntos</span>
      </li>

      <li>
        Acertar equipo que pasa a semifinales:
        <span className="text-green-400 font-bold"> +7 puntos</span>
      </li>

      <li>
        Acertar equipo que pasa a la final:
        <span className="text-green-400 font-bold"> +8 puntos</span>
      </li>

      <li>
        <span className="font-semibold text-yellow-400">
          Caso excepcional - Final:
        </span>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>
            No se aplica el sistema de puntos extra por acertar el cruce.
          </li>
          <li>
            Acertar los dos equipos que llegan a la final:
            <span className="text-red-400 font-bold"> +4 puntos extra</span>
          </li>
          <li>
            Acertar el ganador del Mundial:
            <span className="text-green-400 font-bold"> +10 puntos</span>
          </li>
        </ul>
      </li>

      <li>
        Acertar el equipo que queda tercero
        (gana el partido de 3º y 4º puesto):
        <span className="text-green-400 font-bold"> +3 puntos</span>
      </li>
    </ul>
  </div>

  <div>
    <h3 className="text-amber-400 font-bold text-base mb-2">
      ⭐ Otros
    </h3>
    <ul className="list-disc pl-5 space-y-2">
      <li>
        Acertar el pichichi:
        <span className="text-green-400 font-bold"> +5 puntos</span>
      </li>
      <li>
        En caso de empate a puntos al final de la competición, el participante cuyo pichichi haya marcado más goles será el ganador.
      </li>
    </ul>
  </div>
</div>
          </div>
        </div>
      )}
    </>
  );
}