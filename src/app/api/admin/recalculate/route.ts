import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { updateAllPorraPoints } from '../../../../../lib/points';

export async function POST() {
  try {
    const porras = await prisma.porra.findMany({ select: { id: true, name: true } });

    for (const porra of porras) {
      await updateAllPorraPoints(porra.id);
    }

    return NextResponse.json({ success: true, porrasRecalculated: porras.map(p => p.name) });
  } catch (error) {
    console.error('Error recalculating points:', error);
    return NextResponse.json({ error: 'Error recalculating points' }, { status: 500 });
  }
}
