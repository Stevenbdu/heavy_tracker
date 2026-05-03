// import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';
// import { Pool } from 'pg';
// import { PrismaPg } from '@prisma/adapter-pg';

// // 1. On crée un pool de connexion avec l'URL de ton fichier .env
// const connectionString = process.env.DATABASE_URL;
// const pool = new Pool({ connectionString });

// // 2. On passe le pool à l'adapter Prisma
// const adapter = new PrismaPg(pool);

// // 3. On initialise Prisma avec cet adapter
// const prisma = new PrismaClient({ adapter });
// console.log(prisma.program)

// export async function GET() {
//   try {
//     const count = await prisma.program.count();
    
//     return NextResponse.json({ 
//       status: "success",
//       message: `Connexion DB réussie ! Il y a actuellement ${count} programme(s) enregistré(s).`
//     });

//   } catch (error) {
//     console.error("Erreur de base de données:", error);
//     return NextResponse.json(
//       { status: "error", message: "Impossible de se connecter à la base de données." },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: "Le backend fonctionne !" });
}