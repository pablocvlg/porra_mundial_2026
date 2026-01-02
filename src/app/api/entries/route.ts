import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { participantName, porraId, predictions, pichichi } = req.body;

  // Validar participante permitido
  const allowed = await prisma.allowedParticipant.findFirst({
    where: { name: participantName, porraId },
  });
  if (!allowed) return res.status(403).json({ error: "Participante no permitido" });

  // Crear entry y predicciones
  const entry = await prisma.entry.create({
    data: {
      participantName,
      porraId,
      pichichi,
      predictions: { create: predictions }, // [{ matchId, homeGoals, awayGoals }]
    },
  });

  res.status(200).json(entry);
}