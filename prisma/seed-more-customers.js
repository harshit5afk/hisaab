const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function add() {
  const admin = await p.user.findFirst();
  const list = [
    { name: 'Harshit RO Solutions', phone: '9829011111', state: 'RAJASTHAN', gstin: '08AABCH1111H1Z1', address: 'Shop 12, Water Market, Jaipur', createdBy: admin.id },
    { name: 'Havells Water Supply', phone: '9811223344', state: 'DELHI', gstin: '07AABCH2222H1Z2', address: 'Connaught Place, New Delhi', createdBy: admin.id },
    { name: 'Hindustan RO Spares', phone: '9876543210', state: 'MAHARASHTRA', gstin: '27AABCH3333H1Z3', address: 'Navi Mumbai', createdBy: admin.id },
    { name: 'Hitesh Enterprises', phone: '9988776655', state: 'GUJARAT', gstin: '24AABCH4444H1Z4', address: 'Ring Road, Surat', createdBy: admin.id },
  ];
  for (const c of list) {
    const ex = await p.customer.findFirst({ where: { name: c.name } });
    if (!ex) {
      await p.customer.create({ data: c });
      console.log('Added customer:', c.name);
    }
  }
}

add()
  .then(() => console.log('Done adding H customers'))
  .finally(() => p.$disconnect());
