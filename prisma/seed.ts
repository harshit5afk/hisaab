import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Convert rupees to paise for storage */
const paise = (rupees: number) => rupees * 100;

async function main() {
  console.log('🧹 Clearing existing data...');
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sequence.deleteMany();

  // ─── Users ───────────────────────────────────────────────────────────
  console.log('👤 Seeding users...');
  const passwordHash = await bcrypt.hash('admin123', 12);

  // Demo admin account — matches credentials shown on the login page
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@hisaab.app',
      passwordHash,
      role: 'OWNER',
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: 'Rajesh Sharma',
      email: 'rajesh@sharmatraders.in',
      passwordHash,
      role: 'OWNER',
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Anita Verma',
      email: 'anita@sharmatraders.in',
      passwordHash: await bcrypt.hash('staff123', 12),
      role: 'STAFF',
    },
  });
  console.log(`  ✅ ${admin.email} (password: admin123) — demo account`);
  console.log(`  ✅ ${owner.email} (password: admin123)`);
  console.log(`  ✅ ${staff.email} (password: staff123)`);

  // ─── Customers ───────────────────────────────────────────────────────
  console.log('🏢 Seeding customers...');
  const customerData = [
    { name: 'Amit Traders',          phone: '9821012345', address: 'MG Road, Pune',                  gstin: '27AAAPA1234A1Z5', createdBy: owner.id },
    { name: 'Priya Textiles',        phone: '9845098450', address: 'Commercial Street, Bengaluru',   gstin: '29BBBPB5678B1Z2', createdBy: owner.id },
    { name: 'Sunrise Hardware',      phone: '9911223344', address: 'Sector 18, Noida',               gstin: '09CCCPC9012C1Z8', createdBy: owner.id },
    { name: 'Verma Electronics',     phone: '9876501234', address: 'Karol Bagh, Delhi',              gstin: '07DDDPD3456D1Z1', createdBy: staff.id },
    { name: 'Krishna Enterprises',   phone: '9765432109', address: 'Ashram Road, Ahmedabad',         gstin: '24EEEPE7890E1Z4', createdBy: staff.id },
    { name: 'Malhotra & Sons',       phone: '9654321098', address: 'Model Town, Jalandhar',          gstin: '03FFFPF2345F1Z7', createdBy: owner.id },
    { name: 'Global Packaging Co.',  phone: '9543210987', address: 'Andheri East, Mumbai',           gstin: '27GGGPG6789G1Z0', createdBy: staff.id },
  ];

  const customers = [];
  for (const c of customerData) {
    customers.push(await prisma.customer.create({ data: c }));
  }
  const [amit, priya, sunrise, verma, krishna, malhotra, globalPkg] = customers;
  console.log(`  ✅ Created ${customers.length} customers`);

  // ─── Invoice sequence ────────────────────────────────────────────────
  await prisma.sequence.upsert({
    where: { id: 'invoice_seq' },
    update: { current: 14 },
    create: { id: 'invoice_seq', current: 14 },
  });

  // ─── Invoices (14) ───────────────────────────────────────────────────
  // Amounts in paise — ₹45,000 = 4500000 paise
  console.log('🧾 Seeding invoices...');
  const invoiceData = [
    { invoiceNo: 'INV/26-27/0001', customerId: amit.id,      date: '2026-06-02', amount: paise(45000),  description: 'Steel rods — 2 tonnes',         status: 'SENT' },
    { invoiceNo: 'INV/26-27/0002', customerId: priya.id,     date: '2026-06-05', amount: paise(28500),  description: 'Cotton fabric bulk order',       status: 'SENT' },
    { invoiceNo: 'INV/26-27/0003', customerId: sunrise.id,   date: '2026-06-10', amount: paise(12750),  description: 'Hardware fittings — assorted',   status: 'PAID' },
    { invoiceNo: 'INV/26-27/0004', customerId: verma.id,     date: '2026-06-14', amount: paise(63200),  description: 'LED panels — 40 units',          status: 'SENT' },
    { invoiceNo: 'INV/26-27/0005', customerId: amit.id,      date: '2026-07-01', amount: paise(31000),  description: 'Steel rods — restock',           status: 'PAID' },
    { invoiceNo: 'INV/26-27/0006', customerId: krishna.id,   date: '2026-07-06', amount: paise(18900),  description: 'Office furniture — desks',       status: 'PAID' },
    { invoiceNo: 'INV/26-27/0007', customerId: malhotra.id,  date: '2026-07-11', amount: paise(52400),  description: 'Textile machinery spare parts',   status: 'SENT' },
    { invoiceNo: 'INV/26-27/0008', customerId: priya.id,     date: '2026-07-18', amount: paise(15600),  description: 'Cotton fabric — small order',    status: 'PAID' },
    { invoiceNo: 'INV/26-27/0009', customerId: globalPkg.id, date: '2026-07-22', amount: paise(39800),  description: 'Packaging cartons — 5000 pcs',   status: 'SENT' },
    { invoiceNo: 'INV/26-27/0010', customerId: sunrise.id,   date: '2026-08-03', amount: paise(9400),   description: 'Hardware fittings — refill',     status: 'PAID' },
    { invoiceNo: 'INV/26-27/0011', customerId: verma.id,     date: '2026-08-09', amount: paise(27600),  description: 'Wiring and electrical acc.',     status: 'SENT' },
    { invoiceNo: 'INV/26-27/0012', customerId: amit.id,      date: '2026-08-15', amount: paise(22000),  description: 'Steel rods — monsoon order',     status: 'SENT' },
    { invoiceNo: 'INV/26-27/0013', customerId: krishna.id,   date: '2026-08-21', amount: paise(41200),  description: 'Office chairs — 20 units',       status: 'DRAFT' },
    { invoiceNo: 'INV/26-27/0014', customerId: globalPkg.id, date: '2026-08-27', amount: paise(16750),  description: 'Packaging cartons — reorder',    status: 'SENT' },
  ];

  const invoices = [];
  for (const inv of invoiceData) {
    invoices.push(
      await prisma.invoice.create({
        data: { ...inv, date: new Date(inv.date) },
      }),
    );
  }
  console.log(`  ✅ Created ${invoices.length} invoices`);

  // ─── Purchases (7) ──────────────────────────────────────────────────
  console.log('📦 Seeding purchases...');
  const purchaseData = [
    { billNo: 'PUR-001', vendor: 'Tata Steel Distributors',       date: '2026-06-01', amount: paise(78000),  description: 'Raw steel stock — initial',           createdBy: owner.id },
    { billNo: 'PUR-002', vendor: 'Reliance Textile Mills',        date: '2026-06-08', amount: paise(34500),  description: 'Cotton bulk purchase',                createdBy: owner.id },
    { billNo: 'PUR-003', vendor: 'Havells Supply Co.',             date: '2026-06-20', amount: paise(21300),  description: 'Electrical components',               createdBy: staff.id },
    { billNo: 'PUR-004', vendor: 'National Packaging Suppliers',   date: '2026-07-05', amount: paise(19800),  description: 'Cardboard and packaging material',    createdBy: staff.id },
    { billNo: 'PUR-005', vendor: 'Godrej Furniture Wholesale',     date: '2026-07-19', amount: paise(46200),  description: 'Office furniture stock',              createdBy: owner.id },
    { billNo: 'PUR-006', vendor: 'Tata Steel Distributors',       date: '2026-08-02', amount: paise(55000),  description: 'Raw steel restock — monsoon',         createdBy: owner.id },
    { billNo: 'PUR-007', vendor: 'Havells Supply Co.',             date: '2026-08-16', amount: paise(17400),  description: 'LED components and panels',           createdBy: staff.id },
  ];

  for (const p of purchaseData) {
    await prisma.purchase.create({
      data: { ...p, date: new Date(p.date) },
    });
  }
  console.log(`  ✅ Created ${purchaseData.length} purchases`);

  // ─── Payments (11) ──────────────────────────────────────────────────
  // Deliberately partial for some customers to create real receivable balances
  console.log('💰 Seeding payments...');
  const paymentData = [
    { customerId: amit.id,      invoiceId: invoices[0].id,  date: '2026-06-10', amount: paise(45000),  mode: 'BANK_TRANSFER', note: 'Full payment — INV/0001' },
    { customerId: priya.id,     invoiceId: invoices[1].id,  date: '2026-06-15', amount: paise(20000),  mode: 'UPI',           note: 'Partial — INV/0002 via GPay' },
    { customerId: sunrise.id,   invoiceId: invoices[2].id,  date: '2026-06-18', amount: paise(12750),  mode: 'CASH',          note: 'Full payment — INV/0003' },
    { customerId: verma.id,     invoiceId: invoices[3].id,  date: '2026-06-25', amount: paise(40000),  mode: 'CHEQUE',        note: 'Partial — INV/0004, cheque #8821' },
    { customerId: amit.id,      invoiceId: invoices[4].id,  date: '2026-07-10', amount: paise(31000),  mode: 'BANK_TRANSFER', note: 'Full payment — INV/0005' },
    { customerId: krishna.id,   invoiceId: invoices[5].id,  date: '2026-07-15', amount: paise(18900),  mode: 'UPI',           note: 'Full payment — INV/0006 via PhonePe' },
    { customerId: priya.id,     invoiceId: invoices[7].id,  date: '2026-07-25', amount: paise(15600),  mode: 'CASH',          note: 'Full payment — INV/0008' },
    { customerId: globalPkg.id, invoiceId: invoices[8].id,  date: '2026-07-30', amount: paise(25000),  mode: 'BANK_TRANSFER', note: 'Partial — INV/0009' },
    { customerId: malhotra.id,  invoiceId: invoices[6].id,  date: '2026-08-01', amount: paise(30000),  mode: 'CHEQUE',        note: 'Partial — INV/0007, cheque #7702' },
    { customerId: sunrise.id,   invoiceId: invoices[9].id,  date: '2026-08-10', amount: paise(9400),   mode: 'CASH',          note: 'Full payment — INV/0010' },
    { customerId: amit.id,      invoiceId: invoices[11].id, date: '2026-08-20', amount: paise(15000),  mode: 'UPI',           note: 'Partial — INV/0012 via Paytm' },
  ];

  for (const p of paymentData) {
    await prisma.payment.create({
      data: { ...p, date: new Date(p.date) },
    });
  }
  console.log(`  ✅ Created ${paymentData.length} payments`);

  // ─── Summary ─────────────────────────────────────────────────────────
  console.log('\n📊 Seed Summary — Customer Balances:');
  console.log('─'.repeat(60));
  for (const c of customers) {
    const totalInvoiced = await prisma.invoice.aggregate({
      where: { customerId: c.id },
      _sum: { amount: true },
    });
    const totalPaid = await prisma.payment.aggregate({
      where: { customerId: c.id },
      _sum: { amount: true },
    });
    const invoiced = Number(totalInvoiced._sum.amount || 0) / 100;
    const paid = Number(totalPaid._sum.amount || 0) / 100;
    const balance = invoiced - paid;
    const status = balance === 0 ? '✅' : '⚠️';
    console.log(
      `  ${status} ${c.name.padEnd(24)} invoiced ₹${invoiced.toLocaleString('en-IN').padStart(8)}, paid ₹${paid.toLocaleString('en-IN').padStart(8)}, balance ₹${balance.toLocaleString('en-IN').padStart(8)}`,
    );
  }

  const totalPurchases = await prisma.purchase.aggregate({ _sum: { amount: true } });
  console.log(`\n  📦 Total purchases: ₹${(Number(totalPurchases._sum.amount || 0) / 100).toLocaleString('en-IN')}`);
  console.log('─'.repeat(60));
  console.log('\n✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
