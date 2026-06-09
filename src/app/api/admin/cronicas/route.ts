import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const porraId = req.nextUrl.searchParams.get("porraId");
    const cronicas = await prisma.cronica.findMany({
      where: porraId ? { porraId: Number(porraId) } : undefined,
      include: { porra: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(cronicas);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener crónicas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { porraId, title, content } = await req.json();

    if (!porraId || !content?.trim()) {
      return NextResponse.json({ error: "porraId y content son obligatorios" }, { status: 400 });
    }

    const cronica = await prisma.cronica.create({
      data: { porraId: Number(porraId), title: title?.trim() || null, content: content.trim() },
    });

    return NextResponse.json(cronica, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear la crónica." }, { status: 500 });
  }
}
