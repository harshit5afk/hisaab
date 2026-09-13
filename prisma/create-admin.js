const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: 'admin@gmail.com' },
    });

    if (existing) {
      console.log('✅ Admin user already exists:', existing.email);
      return;
    }

    const passwordHash = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@gmail.com',
        passwordHash,
        role: 'OWNER',
      },
    });

    console.log('✅ Successfully created admin user in Neon PostgreSQL:');
    console.log(`   Email: ${admin.email}`);
    console.log('   Password: admin123');
    console.log(`   Role: ${admin.role}`);
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
