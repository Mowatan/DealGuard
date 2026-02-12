const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dealId = 'cmlf97tyd0005ym8gu664ykly';

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      parties: true,
    },
  });

  if (deal) {
    console.log('Deal found:');
    console.log(JSON.stringify(deal, null, 2));
  } else {
    console.log('Deal NOT found with ID:', dealId);

    // List all deals
    const allDeals = await prisma.deal.findMany({
      select: { id: true, title: true },
    });
    console.log('\nAll deals in database:');
    console.log(JSON.stringify(allDeals, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
