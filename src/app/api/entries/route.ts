// BACKEND PARA ENVIAR UNA PORRA

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

type PredictionInput = {
  matchId: number;
  homeGoals: number;
  awayGoals: number;
  homeTeam?: string;
  awayTeam?: string;
  penaltyWinner?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantName, porraName, predictions, pichichi } = body;

    // Validar que se proporcionaron todos los campos
    if (!participantName || !porraName || !pichichi) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    // Buscar la porra por nombre
    const porra = await prisma.porra.findFirst({
      where: { name: porraName },
    });

    if (!porra) {
      return NextResponse.json(
        { error: "La porra especificada no existe." },
        { status: 404 }
      );
    }

    // Validar que el participante esté permitido en esa porra
    const allowed = await prisma.allowedParticipant.findFirst({
      where: {
        name: participantName,
        porraId: porra.id
      },
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "No tienes permiso para participar en esta porra." },
        { status: 403 }
      );
    }

    // Verificar si el participante ya envió su predicción
    const existingEntry = await prisma.entry.findFirst({
      where: {
        participantName,
        porraId: porra.id,
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: "Ya has enviado tu predicción para esta porra." },
        { status: 400 }
      );
    }

    // Comprobar que no hay placeholders sin resolver en knockout
    const invalidPredictions = predictions.filter((pred: PredictionInput) => {
      // Solo validar si tiene homeTeam y awayTeam (partidos knockout)
      if (pred.homeTeam || pred.awayTeam) {
        const ganadorPattern = /^(?:Ganador|Perdedor)(?: del| de)? Partido \d+$/i;
        // const grupoPattern = /^\d+º Grupo [A-L](?:\/[A-L])*$/i;
        
        const homeIsPlaceholder = pred.homeTeam && (
          ganadorPattern.test(pred.homeTeam)// || 
          // grupoPattern.test(pred.homeTeam)
        );
        
        const awayIsPlaceholder = pred.awayTeam && (
          ganadorPattern.test(pred.awayTeam)// || 
          //grupoPattern.test(pred.awayTeam)
        );
        
        return homeIsPlaceholder || awayIsPlaceholder;
      }
      return false;
    });

    if (invalidPredictions.length > 0) {
      console.log("❌ Predicciones inválidas encontradas:", invalidPredictions);
      return NextResponse.json(
        { 
          error: "Debes completar todos los partidos eliminatorios.",
          details: invalidPredictions.map((p: PredictionInput) => ({
            matchId: p.matchId,
            homeTeam: p.homeTeam,
            awayTeam: p.awayTeam
          }))
        },
        { status: 400 }
      );
    }

    // Crear entry y predicciones
    const entry = await prisma.entry.create({
    data: {
      participantName,
      porraId: porra.id,
      pichichi,
      totalPoints: 0,  // 👈 AGREGAR ESTA LÍNEA
      predictions: {
        create: predictions.map((pred: PredictionInput) => {
          return {
            matchId: pred.matchId,
            homeGoals: pred.homeGoals,
            awayGoals: pred.awayGoals,
            homeTeam: pred.homeTeam ?? null,
            awayTeam: pred.awayTeam ?? null,
            penaltyWinner: pred.penaltyWinner ?? null,
          };
        }),
      },
    },
    include: {
      predictions: true,
    },
  });

    return NextResponse.json(
      {
        message: "Porra enviada correctamente.",
        entry
      },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: "Error al enviar la porra." },
      { status: 500 }
    );
  }
}