import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const matches = await prisma.$queryRaw<{ 
      id: number; 
      homeTeam: string; 
      awayTeam: string; 
      phase: string; 
      group: string | null; 
      homeGoals: number | null; 
      awayGoals: number | null;
      matchOrder: number;
    }[]>`
      SELECT * FROM "Match"
      ORDER BY "matchOrder" ASC
    `;

    return NextResponse.json(matches);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener partidos" }, { status: 500 });
  }
}