import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial system data...');

  // 1. Create Default Tables
  const tables = ['Table 1', 'Table 2'];
  for (const name of tables) {
    await prisma.gameTable.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: 'Standard Match Table',
        isActive: true
      }
    });
  }

  // 2. Create Default Game Configs (Rates)
  const configs = [
    { type: '10_POINTS', price: 20 },
    { type: '20_POINTS', price: 30 }
  ];

  for (const config of configs) {
    await prisma.gameConfig.upsert({
      where: { type: config.type },
      update: { price: config.price },
      create: {
        type: config.type,
        price: config.price
      }
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
