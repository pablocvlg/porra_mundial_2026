import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

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

    // Crear entry y predicciones
    const entry = await prisma.entry.create({
      data: {
        participantName,
        porraId: porra.id,
        pichichi,
        predictions: { create: predictions },
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
    console.error("Error creating entry:", error);
    return NextResponse.json(
      { error: "Error al crear la entrada." },
      { status: 500 }
    );
  }
}