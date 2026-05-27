import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { updateAllPorraPoints, resolveAndUpdateMatchTeams } from '../../../../../../lib/points';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const resolvedParams = await params;
    const matchId = parseInt(resolvedParams.matchId);
    const body = await request.json();
    
    const {
      homeGoals,
      awayGoals,
      penaltyWinner,
      homeTeam,
      awayTeam,
      isFinished
    } = body;

    // Actualizar el partido
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeGoals: homeGoals !== undefined && homeGoals !== '' ? parseInt(homeGoals) : null,
        awayGoals: awayGoals !== undefined && awayGoals !== '' ? parseInt(awayGoals) : null,
        penaltyWinner: penaltyWinner || null,
        homeTeam: homeTeam || undefined,
        awayTeam: awayTeam || undefined,
        isFinished: isFinished ?? undefined,
      }
    });

    let pointsRecalculated = false;

    // Si el partido está finalizado, resolver nombres de equipo y recalcular puntos
    if (isFinished) {
      // Resuelve placeholders ("1º Grupo A", "Ganador Partido 73"...) con los resultados reales
      await resolveAndUpdateMatchTeams(matchId);

      const predictions = await prisma.prediction.findMany({
        where: { matchId },
        include: { entry: true }
      });
      
      const porraIds = [...new Set(predictions.map(p => p.entry.porraId))];
      
      for (const porraId of porraIds) {
        await updateAllPorraPoints(porraId);
      }

      pointsRecalculated = true;
    }

    return NextResponse.json({ 
      success: true, 
      match: updatedMatch,
      pointsRecalculated
    });

  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: 'Error updating match' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const resolvedParams = await params;
    const match = await prisma.match.findUnique({
      where: { id: parseInt(resolvedParams.matchId) }
    });

    return NextResponse.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json(
      { error: 'Error fetching match' },
      { status: 500 }
    );
  }
}