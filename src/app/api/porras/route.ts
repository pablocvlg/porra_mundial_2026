import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const porras = await prisma.porra.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(porras);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener las porras." },
      { status: 500 }
    );
  }
}