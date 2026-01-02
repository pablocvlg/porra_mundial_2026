import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1️⃣ Borrar partidos existentes
  await prisma.match.deleteMany({});

  // 2️⃣ Seed de partidos de fase de grupos
  const groupMatches = [
    // Grupo A
    { homeTeam: "México", awayTeam: "Sudáfrica", phase: "Group", group: "A", matchOrder: 1 },
    { homeTeam: "Corea del Sur", awayTeam: "Dinamarca/Macedonia/República Checa/Irlanda", phase: "Group", group: "A", matchOrder: 2 },
    { homeTeam: "Dinamarca/Macedonia/República Checa/Irlanda", awayTeam: "Sudáfrica", phase: "Group", group: "A", matchOrder: 3 },
    { homeTeam: "México", awayTeam: "Corea del Sur", phase: "Group", group: "A", matchOrder: 4 },

    // Grupo B
    { homeTeam: "Canadá", awayTeam: "Italia/Nigeria/Gales/Bosnia", phase: "Group", group: "B", matchOrder: 5 },
    { homeTeam: "Catar", awayTeam: "Suiza", phase: "Group", group: "B", matchOrder: 6 },
    { homeTeam: "Suiza", awayTeam: "Italia/Nigeria/Gales/Bosnia", phase: "Group", group: "B", matchOrder: 7 },
    { homeTeam: "Canadá", awayTeam: "Catar", phase: "Group", group: "B", matchOrder: 8 },

    // Grupo C
    { homeTeam: "Brasil", awayTeam: "Marruecos", phase: "Group", group: "C", matchOrder: 9 },
    { homeTeam: "Haití", awayTeam: "Escocia", phase: "Group", group: "C", matchOrder: 10 },
    { homeTeam: "Escocia", awayTeam: "Marruecos", phase: "Group", group: "C", matchOrder: 11 },
    { homeTeam: "Brasil", awayTeam: "Haití", phase: "Group", group: "C", matchOrder: 12 },

    // Grupo D
    { homeTeam: "Estados Unidos", awayTeam: "Paraguay", phase: "Group", group: "D", matchOrder: 13 },
    { homeTeam: "Australia", awayTeam: "Turquía/Rumania/Eslovaquia/Kosovo", phase: "Group", group: "D", matchOrder: 14 },
    { homeTeam: "Estados Unidos", awayTeam: "Australia", phase: "Group", group: "D", matchOrder: 15 },
    { homeTeam: "Paraguay", awayTeam: "Turquía/Rumania/Eslovaquia/Kosovo", phase: "Group", group: "D", matchOrder: 16 },

    // Grupo E
    { homeTeam: "Alemania", awayTeam: "Curazao", phase: "Group", group: "E", matchOrder: 17 },
    { homeTeam: "Costa de Marfil", awayTeam: "Ecuador", phase: "Group", group: "E", matchOrder: 18 },
    { homeTeam: "Alemania", awayTeam: "Costa de Marfil", phase: "Group", group: "E", matchOrder: 19 },
    { homeTeam: "Ecuador", awayTeam: "Curazao", phase: "Group", group: "E", matchOrder: 20 },

    // Grupo F
    { homeTeam: "Países Bajos", awayTeam: "Japón", phase: "Group", group: "F", matchOrder: 21 },
    { homeTeam: "Ucrania/Suecia/Polonia/Albania", awayTeam: "Túnez", phase: "Group", group: "F", matchOrder: 22 },
    { homeTeam: "Países Bajos", awayTeam: "Ucrania/Suecia/Polonia/Albania", phase: "Group", group: "F", matchOrder: 23 },
    { homeTeam: "Túnez", awayTeam: "Japón", phase: "Group", group: "F", matchOrder: 24 },

    // Grupo G
    { homeTeam: "Bélgica", awayTeam: "Egipto", phase: "Group", group: "G", matchOrder: 25 },
    { homeTeam: "Irán", awayTeam: "Nueva Zelanda", phase: "Group", group: "G", matchOrder: 26 },
    { homeTeam: "Bélgica", awayTeam: "Irán", phase: "Group", group: "G", matchOrder: 27 },
    { homeTeam: "Egipto", awayTeam: "Nueva Zelanda", phase: "Group", group: "G", matchOrder: 28 },

    // Grupo H
    { homeTeam: "España", awayTeam: "Cabo Verde", phase: "Group", group: "H", matchOrder: 29 },
    { homeTeam: "Arabia Saudí", awayTeam: "Uruguay", phase: "Group", group: "H", matchOrder: 30 },
    { homeTeam: "España", awayTeam: "Arabia Saudí", phase: "Group", group: "H", matchOrder: 31 },
    { homeTeam: "Cabo Verde", awayTeam: "Uruguay", phase: "Group", group: "H", matchOrder: 32 },

    // Grupo I
    { homeTeam: "Francia", awayTeam: "Senegal", phase: "Group", group: "I", matchOrder: 33 },
    { homeTeam: "Irak/Bolivia/Surinam", awayTeam: "Noruega", phase: "Group", group: "I", matchOrder: 34 },
    { homeTeam: "Francia", awayTeam: "Irak/Bolivia/Surinam", phase: "Group", group: "I", matchOrder: 35 },
    { homeTeam: "Noruega", awayTeam: "Senegal", phase: "Group", group: "I", matchOrder: 36 },

    // Grupo J
    { homeTeam: "Argentina", awayTeam: "Argelia", phase: "Group", group: "J", matchOrder: 37 },
    { homeTeam: "Austria", awayTeam: "Jordania", phase: "Group", group: "J", matchOrder: 38 },
    { homeTeam: "Argentina", awayTeam: "Austria", phase: "Group", group: "J", matchOrder: 39 },
    { homeTeam: "Jordania", awayTeam: "Argelia", phase: "Group", group: "J", matchOrder: 40 },

    // Grupo K
    { homeTeam: "Portugal", awayTeam: "Jamaica/RD de Congo/Nueva Caledonia", phase: "Group", group: "K", matchOrder: 41 },
    { homeTeam: "Uzbekistán", awayTeam: "Colombia", phase: "Group", group: "K", matchOrder: 42 },
    { homeTeam: "Portugal", awayTeam: "Uzbekistán", phase: "Group", group: "K", matchOrder: 43 },
    { homeTeam: "Colombia", awayTeam: "Jamaica/RD de Congo/Nueva Caledonia", phase: "Group", group: "K", matchOrder: 44 },

    // Grupo L
    { homeTeam: "Inglaterra", awayTeam: "Croacia", phase: "Group", group: "L", matchOrder: 45 },
    { homeTeam: "Ghana", awayTeam: "Panamá", phase: "Group", group: "L", matchOrder: 46 },
    { homeTeam: "Inglaterra", awayTeam: "Ghana", phase: "Group", group: "L", matchOrder: 47 },
    { homeTeam: "Croacia", awayTeam: "Panamá", phase: "Group", group: "L", matchOrder: 48 },
  ];

  // 3️⃣ Seed de knockout (16avos hasta final)
  const knockoutMatches = [
    { homeTeam: "2º Grupo A", awayTeam: "2º Grupo B", phase: "Round of 16", matchOrder: 73 },
    { homeTeam: "1º Grupo E", awayTeam: "3º Grupo A/B/C/D/F", phase: "Round of 16", matchOrder: 74 },
    { homeTeam: "1º Grupo F", awayTeam: "2º Grupo C", phase: "Round of 16", matchOrder: 75 },
    { homeTeam: "1º Grupo E", awayTeam: "2º Grupo F", phase: "Round of 16", matchOrder: 76 },
    { homeTeam: "1º Grupo I", awayTeam: "3º Grupo C/D/F/G/H", phase: "Round of 16", matchOrder: 77 },
    { homeTeam: "2º Grupo E", awayTeam: "2º Grupo I", phase: "Round of 16", matchOrder: 78 },
    { homeTeam: "1º Grupo A", awayTeam: "3º Grupo C/E/F/H/I", phase: "Round of 16", matchOrder: 79 },
    { homeTeam: "1º Grupo L", awayTeam: "3º Grupo E/H/I/J/K", phase: "Round of 16", matchOrder: 80 },
    { homeTeam: "1º Grupo D", awayTeam: "3º Grupo B/E/F/I/J", phase: "Round of 16", matchOrder: 81 },
    { homeTeam: "1º Grupo G", awayTeam: "3º Grupo A/E/H/I/J", phase: "Round of 16", matchOrder: 82 },
    { homeTeam: "2º Grupo K", awayTeam: "2º Grupo L", phase: "Round of 16", matchOrder: 83 },
    { homeTeam: "1º Grupo H", awayTeam: "2º Grupo J", phase: "Round of 16", matchOrder: 84 },
    { homeTeam: "1º Grupo B", awayTeam: "3º Grupo E/F/G/I/J", phase: "Round of 16", matchOrder: 85 },
    { homeTeam: "1º Grupo J", awayTeam: "2º Grupo H", phase: "Round of 16", matchOrder: 86 },
    { homeTeam: "1º Grupo K", awayTeam: "3º Grupo D/E/I/J/L", phase: "Round of 16", matchOrder: 87 },
    { homeTeam: "2º Grupo D", awayTeam: "2º Grupo G", phase: "Round of 16", matchOrder: 88 },

    // Cuartos
    { homeTeam: "Ganador Partido 89", awayTeam: "Ganador Partido 90", phase: "Quarterfinal", matchOrder: 97 },
    { homeTeam: "Ganador Partido 93", awayTeam: "Ganador Partido 94", phase: "Quarterfinal", matchOrder: 98 },
    { homeTeam: "Ganador Partido 91", awayTeam: "Ganador Partido 92", phase: "Quarterfinal", matchOrder: 99 },
    { homeTeam: "Ganador Partido 95", awayTeam: "Ganador Partido 96", phase: "Quarterfinal", matchOrder: 100 },

    // Semifinales
    { homeTeam: "Ganador Partido 97", awayTeam: "Ganador Partido 98", phase: "Semifinal", matchOrder: 101 },
    { homeTeam: "Ganador Partido 99", awayTeam: "Ganador Partido 100", phase: "Semifinal", matchOrder: 102 },

    // Tercer puesto
    { homeTeam: "Perdedor Partido 101", awayTeam: "Perdedor Partido 102", phase: "Third Place", matchOrder: 103 },

    // Final
    { homeTeam: "Ganador Partido 101", awayTeam: "Ganador Partido 102", phase: "Final", matchOrder: 104 },
  ];

  // 4️⃣ Insertar partidos en la DB
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