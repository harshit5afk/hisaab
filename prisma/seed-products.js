const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const products = [
  { name: 'INLINE CRUZE SEDIMENT 10 INCH', hsn: '84219900', rate: 45000, unit: 'NOS' },
  { name: 'INLINE CRUZE PRE CARBON 10 INCH', hsn: '84219900', rate: 42000, unit: 'NOS' },
  { name: 'INLINE CRUZE POST CARBON 10 INCH', hsn: '84219900', rate: 38000, unit: 'NOS' },
  { name: 'MEMBRANE 75 GPD VONTRON ORIGINAL', hsn: '84212190', rate: 145000, unit: 'NOS' },
  { name: 'MEMBRANE 80 GPD CSM RESIDENTIAL', hsn: '84212190', rate: 165000, unit: 'NOS' },
  { name: 'MEMBRANE 100 GPD DOW FILMTEC', hsn: '84212190', rate: 220000, unit: 'NOS' },
  { name: 'RO BOOSTER PUMP 100 GPD KEMFLO', hsn: '84137090', rate: 185000, unit: 'NOS' },
  { name: 'RO BOOSTER PUMP 75 GPD CCK TAIWAN', hsn: '84137090', rate: 155000, unit: 'NOS' },
  { name: 'RO BOOSTER PUMP 150 GPD GRAND FOREST', hsn: '84137090', rate: 240000, unit: 'NOS' },
  { name: 'SMPS POWER ADAPTOR 24V 2.5A', hsn: '85044090', rate: 65000, unit: 'NOS' },
  { name: 'SMPS POWER ADAPTOR 36V 2A COPPER', hsn: '85044090', rate: 75000, unit: 'NOS' },
  { name: 'SOLENOID VALVE 24V DC SLX BLUE', hsn: '84818030', rate: 32000, unit: 'NOS' },
  { name: 'FLOAT VALVE MICRO SWITCH HEAVY', hsn: '84818090', rate: 18000, unit: 'NOS' },
  { name: 'FLOW RESTRICTOR FR 450 QUICK CONNECT', hsn: '84219900', rate: 8500, unit: 'NOS' },
  { name: 'FLOW RESTRICTOR FR 650 PUSH FIT', hsn: '84219900', rate: 9500, unit: 'NOS' },
  { name: 'SPUN POLYPROPYLENE FILTER 10 INCH 5 MICRON', hsn: '84219900', rate: 12000, unit: 'NOS' },
  { name: 'CTO CARBON BLOCK FILTER CARTRIDGE 10 INCH', hsn: '84219900', rate: 28000, unit: 'NOS' },
  { name: 'ALKALINE BIO-MINERAL PH BOOSTER CARTRIDGE', hsn: '84219900', rate: 55000, unit: 'NOS' },
  { name: 'UF ULTRA FILTRATION HOLLOW FIBER MEMBRANE', hsn: '84212190', rate: 48000, unit: 'NOS' },
  { name: 'TDS CONTROLLER / ADJUSTER BRASS VALVE', hsn: '84818090', rate: 16000, unit: 'NOS' },
  { name: 'PRE-FILTER HOUSING 10 INCH BOWL WHITE', hsn: '84219900', rate: 35000, unit: 'NOS' },
  { name: 'RO MEMBRANE HOUSING FOOD GRADE HEAVY', hsn: '84219900', rate: 29000, unit: 'NOS' },
  { name: 'AUTO FLUSHING CONTROLLER TIMER 18 SEC', hsn: '85371000', rate: 85000, unit: 'NOS' },
  { name: 'WATER STORAGE TANK 12 LITRE HYDROPNEUMATIC', hsn: '39269099', rate: 125000, unit: 'NOS' },
  { name: 'PRESSURE REDUCING VALVE (PRV) 1/4 INCH', hsn: '84818090', rate: 34000, unit: 'NOS' },
  { name: 'LOW PRESSURE SWITCH (LPS) QUICK FIT', hsn: '85365090', rate: 19000, unit: 'NOS' },
  { name: 'HIGH PRESSURE SWITCH (HPS) QUICK FIT', hsn: '85365090', rate: 21000, unit: 'NOS' },
  { name: 'SYS MARS BLACK RO CABINET SYSTEM', hsn: '84212190', rate: 400000, unit: 'NOS' },
  { name: 'COPPER + ZINC MINERAL ENRICHER CARTRIDGE', hsn: '84219900', rate: 65000, unit: 'NOS' },
  { name: 'UV STAINLESS STEEL CHAMBER WITH PHILIPS TUBE', hsn: '84212190', rate: 135000, unit: 'NOS' },
];

async function seed() {
  console.log('Seeding products...');
  for (const item of products) {
    const existing = await prisma.product.findFirst({
      where: { name: item.name, deletedAt: null },
    });
    if (!existing) {
      await prisma.product.create({ data: item });
      console.log('Created product:', item.name);
    } else {
      await prisma.product.update({
        where: { id: existing.id },
        data: { hsn: item.hsn, rate: item.rate, unit: item.unit },
      });
      console.log('Updated product:', item.name);
    }
  }
  const total = await prisma.product.count({ where: { deletedAt: null } });
  console.log('Total products in database:', total);
}

seed()
  .catch((err) => {
    console.error('Failed to seed products:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
