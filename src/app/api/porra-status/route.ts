// BACKEND PARA OBTENER TODA LA INFORMACIÓN DE UNA PORRA (GRUPO)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const porraName = searchParams.get("porraName");

  if (!porraName) {
    return NextResponse.json(
      { error: "Falta el nombre de la porra" },
      { status: 400 }
    );
  }

  // Buscar la porra
  const porra = await prisma.porra.findFirst({
    where: { name: porraName },
  });

  if (!porra) {
    return NextResponse.json(
      { error: "Porra no encontrada" },
      { status: 404 }
    );
  }

  // Obtener todas las entries de esa porra con sus predicciones
  const allEntries = await prisma.entry.findMany({
    where: { porraId: porra.id },
    include: {
      predictions: {
        include: {
          match: true,
        },
      },
    },
    orderBy: { participantName: 'asc' },
  });

  return NextResponse.json({
    porra,
    allEntries,
  });
}