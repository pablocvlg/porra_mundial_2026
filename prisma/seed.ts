import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1️⃣ Borrar partidos existentes y reiniciar IDs
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Match" RESTART IDENTITY CASCADE;`
  );

  // 2️⃣ Seed de partidos de fase de grupos (6 por grupo)
  const groupMatches = [
    // ===== Grupo A =====
    { homeTeam: "México", awayTeam: "Sudáfrica", phase: "Group", group: "A", matchOrder: 1 },
    { homeTeam: "Corea del Sur", awayTeam: "Dinamarca/Macedonia/República Checa/Irlanda", phase: "Group", group: "A", matchOrder: 2 },
    { homeTeam: "Dinamarca/Macedonia/República Checa/Irlanda", awayTeam: "Sudáfrica", phase: "Group", group: "A", matchOrder: 3 },
    { homeTeam: "México", awayTeam: "Corea del Sur", phase: "Group", group: "A", matchOrder: 4 },
    { homeTeam: "Dinamarca/Macedonia/República Checa/Irlanda", awayTeam: "México", phase: "Group", group: "A", matchOrder: 5 },
    { homeTeam: "Sudáfrica", awayTeam: "Corea del Sur", phase: "Group", group: "A", matchOrder: 6 },

    // ===== Grupo B =====
    { homeTeam: "Canadá", awayTeam: "Italia/Nigeria/Gales/Bosnia", phase: "Group", group: "B", matchOrder: 7 },
    { homeTeam: "Catar", awayTeam: "Suiza", phase: "Group", group: "B", matchOrder: 8 },
    { homeTeam: "Suiza", awayTeam: "Italia/Nigeria/Gales/Bosnia", phase: "Group", group: "B", matchOrder: 9 },
    { homeTeam: "Canadá", awayTeam: "Catar", phase: "Group", group: "B", matchOrder: 10 },
    { homeTeam: "Suiza", awayTeam: "Canadá", phase: "Group", group: "B", matchOrder: 11 },
    { homeTeam: "Italia/Nigeria/Gales/Bosnia", awayTeam: "Catar", phase: "Group", group: "B", matchOrder: 12 },

    // ===== Grupo C =====
    { homeTeam: "Brasil", awayTeam: "Marruecos", phase: "Group", group: "C", matchOrder: 13 },
    { homeTeam: "Haití", awayTeam: "Escocia", phase: "Group", group: "C", matchOrder: 14 },
    { homeTeam: "Escocia", awayTeam: "Marruecos", phase: "Group", group: "C", matchOrder: 15 },
    { homeTeam: "Brasil", awayTeam: "Haití", phase: "Group", group: "C", matchOrder: 16 },
    { homeTeam: "Marruecos", awayTeam: "Haití", phase: "Group", group: "C", matchOrder: 17 },
    { homeTeam: "Escocia", awayTeam: "Brasil", phase: "Group", group: "C", matchOrder: 18 },

    // ===== Grupo D =====
    { homeTeam: "Estados Unidos", awayTeam: "Paraguay", phase: "Group", group: "D", matchOrder: 19 },
    { homeTeam: "Australia", awayTeam: "Turquía/Rumania/Eslovaquia/Kosovo", phase: "Group", group: "D", matchOrder: 20 },
    { homeTeam: "Estados Unidos", awayTeam: "Australia", phase: "Group", group: "D", matchOrder: 21 },
    { homeTeam: "Paraguay", awayTeam: "Turquía/Rumania/Eslovaquia/Kosovo", phase: "Group", group: "D", matchOrder: 22 },
    { homeTeam: "Paraguay", awayTeam: "Estados Unidos", phase: "Group", group: "D", matchOrder: 23 },
    { homeTeam: "Turquía/Rumania/Eslovaquia/Kosovo", awayTeam: "Australia", phase: "Group", group: "D", matchOrder: 24 },

    // ===== Grupo E =====
    { homeTeam: "Alemania", awayTeam: "Curazao", phase: "Group", group: "E", matchOrder: 25 },
    { homeTeam: "Costa de Marfil", awayTeam: "Ecuador", phase: "Group", group: "E", matchOrder: 26 },
    { homeTeam: "Alemania", awayTeam: "Costa de Marfil", phase: "Group", group: "E", matchOrder: 27 },
    { homeTeam: "Ecuador", awayTeam: "Curazao", phase: "Group", group: "E", matchOrder: 28 },
    { homeTeam: "Curazao", awayTeam: "Costa de Marfil", phase: "Group", group: "E", matchOrder: 29 },
    { homeTeam: "Ecuador", awayTeam: "Alemania", phase: "Group", group: "E", matchOrder: 30 },

    // ===== Grupo F =====
    { homeTeam: "Países Bajos", awayTeam: "Japón", phase: "Group", group: "F", matchOrder: 31 },
    { homeTeam: "Ucrania/Suecia/Polonia/Albania", awayTeam: "Túnez", phase: "Group", group: "F", matchOrder: 32 },
    { homeTeam: "Países Bajos", awayTeam: "Ucrania/Suecia/Polonia/Albania", phase: "Group", group: "F", matchOrder: 33 },
    { homeTeam: "Túnez", awayTeam: "Japón", phase: "Group", group: "F", matchOrder: 34 },
    { homeTeam: "Japón", awayTeam: "Ucrania/Suecia/Polonia/Albania", phase: "Group", group: "F", matchOrder: 35 },
    { homeTeam: "Túnez", awayTeam: "Países Bajos", phase: "Group", group: "F", matchOrder: 36 },

    // ===== Grupo G =====
    { homeTeam: "Bélgica", awayTeam: "Egipto", phase: "Group", group: "G", matchOrder: 37 },
    { homeTeam: "Irán", awayTeam: "Nueva Zelanda", phase: "Group", group: "G", matchOrder: 38 },
    { homeTeam: "Bélgica", awayTeam: "Irán", phase: "Group", group: "G", matchOrder: 39 },
    { homeTeam: "Nueva Zelanda", awayTeam: "Egipto", phase: "Group", group: "G", matchOrder: 40 },
    { homeTeam: "Egipto", awayTeam: "Irán", phase: "Group", group: "G", matchOrder: 41 },
    { homeTeam: "Nueva Zelanda", awayTeam: "Bélgica", phase: "Group", group: "G", matchOrder: 42 },

    // ===== Grupo H =====
    { homeTeam: "España", awayTeam: "Cabo Verde", phase: "Group", group: "H", matchOrder: 43 },
    { homeTeam: "Arabia Saudí", awayTeam: "Uruguay", phase: "Group", group: "H", matchOrder: 44 },
    { homeTeam: "España", awayTeam: "Arabia Saudí", phase: "Group", group: "H", matchOrder: 45 },
    { homeTeam: "Uruguay", awayTeam: "Cabo Verde", phase: "Group", group: "H", matchOrder: 46 },
    { homeTeam: "Uruguay", awayTeam: "España", phase: "Group", group: "H", matchOrder: 47 },
    { homeTeam: "Cabo Verde", awayTeam: "Arabia Saudí", phase: "Group", group: "H", matchOrder: 48 },

    // ===== Grupo I =====
    { homeTeam: "Francia", awayTeam: "Senegal", phase: "Group", group: "I", matchOrder: 49 },
    { homeTeam: "Irak/Bolivia/Surinam", awayTeam: "Noruega", phase: "Group", group: "I", matchOrder: 50 },
    { homeTeam: "Francia", awayTeam: "Irak/Bolivia/Surinam", phase: "Group", group: "I", matchOrder: 51 },
    { homeTeam: "Noruega", awayTeam: "Senegal", phase: "Group", group: "I", matchOrder: 52 },
    { homeTeam: "Noruega", awayTeam: "Francia", phase: "Group", group: "I", matchOrder: 53 },
    { homeTeam: "Senegal", awayTeam: "Irak/Bolivia/Surinam", phase: "Group", group: "I", matchOrder: 54 },

    // ===== Grupo J =====
    { homeTeam: "Argentina", awayTeam: "Argelia", phase: "Group", group: "J", matchOrder: 55 },
    { homeTeam: "Austria", awayTeam: "Jordania", phase: "Group", group: "J", matchOrder: 56 },
    { homeTeam: "Argentina", awayTeam: "Austria", phase: "Group", group: "J", matchOrder: 57 },
    { homeTeam: "Jordania", awayTeam: "Argelia", phase: "Group", group: "J", matchOrder: 58 },
    { homeTeam: "Argelia", awayTeam: "Austria", phase: "Group", group: "J", matchOrder: 59 },
    { homeTeam: "Jordania", awayTeam: "Argentina", phase: "Group", group: "J", matchOrder: 60 },

    // ===== Grupo K =====
    { homeTeam: "Portugal", awayTeam: "Jamaica/RD de Congo/Nueva Caledonia", phase: "Group", group: "K", matchOrder: 61 },
    { homeTeam: "Uzbekistán", awayTeam: "Colombia", phase: "Group", group: "K", matchOrder: 62 },
    { homeTeam: "Portugal", awayTeam: "Uzbekistán", phase: "Group", group: "K", matchOrder: 63 },
    { homeTeam: "Colombia", awayTeam: "Jamaica/RD de Congo/Nueva Caledonia", phase: "Group", group: "K", matchOrder: 64 },
    { homeTeam: "Colombia", awayTeam: "Portugal", phase: "Group", group: "K", matchOrder: 65 },
    { homeTeam: "Jamaica/RD de Congo/Nueva Caledonia", awayTeam: "Uzbekistán", phase: "Group", group: "K", matchOrder: 66 },

    // ===== Grupo L =====
    { homeTeam: "Inglaterra", awayTeam: "Croacia", phase: "Group", group: "L", matchOrder: 67 },
    { homeTeam: "Ghana", awayTeam: "Panamá", phase: "Group", group: "L", matchOrder: 68 },
    { homeTeam: "Inglaterra", awayTeam: "Ghana", phase: "Group", group: "L", matchOrder: 69 },
    { homeTeam: "Panamá", awayTeam: "Croacia", phase: "Group", group: "L", matchOrder: 70 },
    { homeTeam: "Panamá", awayTeam: "Inglaterra", phase: "Group", group: "L", matchOrder: 71 },
    { homeTeam: "Croacia", awayTeam: "Ghana", phase: "Group", group: "L", matchOrder: 72 },
  ];

  // 3️⃣ Seed de knockout (continuando con 73 → 96)
  const knockoutMatches = [
    { homeTeam: "1º Grupo E", awayTeam: "3º Grupo A/B/C/D/F", phase: "Round of 32", matchOrder: 73 },
    { homeTeam: "1º Grupo L", awayTeam: "3º Grupo C/D/F/G/H", phase: "Round of 32", matchOrder: 74 },
    { homeTeam: "2º Grupo A", awayTeam: "2º Grupo B", phase: "Round of 32", matchOrder: 75 },
    { homeTeam: "1º Grupo F", awayTeam: "2º Grupo C", phase: "Round of 32", matchOrder: 76 },
    { homeTeam: "2º Grupo K", awayTeam: "2º Grupo L", phase: "Round of 32", matchOrder: 77 },
    { homeTeam: "1º Grupo H", awayTeam: "2º Grupo J", phase: "Round of 32", matchOrder: 78 },
    { homeTeam: "1º Grupo D", awayTeam: "3º Grupo B/E/F/I/J", phase: "Round of 32", matchOrder: 79 },
    { homeTeam: "1º Grupo G", awayTeam: "3º Grupo A/E/H/I/J", phase: "Round of 32", matchOrder: 80 },
    { homeTeam: "1º Grupo C", awayTeam: "2º Grupo F", phase: "Round of 32", matchOrder: 81 },
    { homeTeam: "2º Grupo E", awayTeam: "2º Grupo L", phase: "Round of 32", matchOrder: 82 },
    { homeTeam: "1º Grupo A", awayTeam: "3º Grupo C/E/F/H/I", phase: "Round of 32", matchOrder: 83 },
    { homeTeam: "1º Grupo L", awayTeam: "3º Grupo E/H/I/J/K", phase: "Round of 32", matchOrder: 84 },
    { homeTeam: "1º Grupo J", awayTeam: "2º Grupo H", phase: "Round of 32", matchOrder: 85 },
    { homeTeam: "2º Grupo D", awayTeam: "2º Grupo G", phase: "Round of 32", matchOrder: 86 },
    { homeTeam: "1º Grupo B", awayTeam: "3º Grupo E/F/G/I/J", phase: "Round of 32", matchOrder: 87 },
    { homeTeam: "1º Grupo K", awayTeam: "3º Grupo D/E/I/J/L", phase: "Round of 32", matchOrder: 88 },

    { homeTeam: "Ganador Partido 73", awayTeam: "Ganador Partido 74", phase: "Round of 16", matchOrder: 89 },
    { homeTeam: "Ganador Partido 75", awayTeam: "Ganador Partido 76", phase: "Round of 16", matchOrder: 90 },
    { homeTeam: "Ganador Partido 77", awayTeam: "Ganador Partido 78", phase: "Round of 16", matchOrder: 91 },
    { homeTeam: "Ganador Partido 79", awayTeam: "Ganador Partido 80", phase: "Round of 16", matchOrder: 92 },
    { homeTeam: "Ganador Partido 81", awayTeam: "Ganador Partido 82", phase: "Round of 16", matchOrder: 93 },
    { homeTeam: "Ganador Partido 83", awayTeam: "Ganador Partido 84", phase: "Round of 16", matchOrder: 94 },
    { homeTeam: "Ganador Partido 85", awayTeam: "Ganador Partido 86", phase: "Round of 16", matchOrder: 95 },
    { homeTeam: "Ganador Partido 87", awayTeam: "Ganador Partido 88", phase: "Round of 16", matchOrder: 96 },

    { homeTeam: "Ganador Partido 89", awayTeam: "Ganador Partido 90", phase: "Quarterfinal", matchOrder: 97 },
    { homeTeam: "Ganador Partido 91", awayTeam: "Ganador Partido 92", phase: "Quarterfinal", matchOrder: 98 },
    { homeTeam: "Ganador Partido 93", awayTeam: "Ganador Partido 94", phase: "Quarterfinal", matchOrder: 99 },
    { homeTeam: "Ganador Partido 95", awayTeam: "Ganador Partido 96", phase: "Quarterfinal", matchOrder: 100 },

    { homeTeam: "Ganador Partido 97", awayTeam: "Ganador Partido 98", phase: "Semifinal", matchOrder: 101 },
    { homeTeam: "Ganador Partido 99", awayTeam: "Ganador Partido 100", phase: "Semifinal", matchOrder: 102 },

    { homeTeam: "Perdedor Partido 101", awayTeam: "Perdedor Partido 102", phase: "Third Place", matchOrder: 103 },
    { homeTeam: "Ganador Partido 101", awayTeam: "Ganador Partido 102", phase: "Final", matchOrder: 104 },
  ];

  // 4️⃣ Insertar todos los partidos
  for (const match of [...groupMatches, ...knockoutMatches]) {
    await prisma.match.create({ data: match });
  }

  console.log("✅ Seed de todos los partidos reemplazado con éxito");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });