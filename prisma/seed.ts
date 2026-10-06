import { ensureDatabaseBootstrapped } from "../src/services/bootstrap";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Iniciando seed de demonstração e produção...");
  const res = await ensureDatabaseBootstrapped(true);
  console.log("Resultado do seed:", res);
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
