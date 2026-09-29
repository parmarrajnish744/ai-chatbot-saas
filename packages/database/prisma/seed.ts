import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.usageMetric.deleteMany();
  await prisma.automationWorkflow.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 2. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@bistro.com',
      passwordHash: '$2b$10$epBqbF79iJ9Qp19z6o9Cce9Wc8LhG0gR1gW1gW1gW1gW1gW1gW1gW', // hash for "password123"
      firstName: 'Marco',
      lastName: 'Rossi',
    },
  });

  const clinicUser = await prisma.user.create({
    data: {
      email: 'dr.smith@apexdental.com',
      passwordHash: '$2b$10$epBqbF79iJ9Qp19z6o9Cce9Wc8LhG0gR1gW1gW1gW1gW1gW1gW1gW',
      firstName: 'Sarah',
      lastName: 'Smith',
    },
  });

  // 3. Create Tenant 1: Gourmet Bistro (Restaurant Blueprint)
  const bistroTenant = await prisma.tenant.create({
    data: {
      name: 'Gourmet Bistro',
      slug: 'gourmet-bistro',
      planId: 'growth',
      settings: {
        industry: 'restaurant',
        systemPrompt: 'You are an attentive and welcoming concierge for Gourmet Bistro.',
        businessHours: { open: '11:30', close: '22:30' },
      },
    },
  });

  await prisma.membership.create({
    data: {
      tenantId: bistroTenant.id,
      userId: adminUser.id,
      role: 'OWNER',
    },
  });

  // Create Channel for Bistro
  const bistroChannel = await prisma.channel.create({
    data: {
      tenantId: bistroTenant.id,
      type: 'WHATSAPP',
      name: 'Bistro WhatsApp Care',
      identifier: '+15550192834',
      credentials: {
        phoneNumberId: '1092837465',
        accessToken: 'mock_meta_token_bistro',
        verifyToken: 'bistro_verify_secret',
      },
    },
  });

  // Create Sample Products for Bistro
  await prisma.product.createMany({
    data: [
      {
        tenantId: bistroTenant.id,
        externalId: 'prod_101',
        name: 'Truffle Tagliolini',
        description: 'Handmade tagliolini with black summer truffle and aged Parmigiano Reggiano.',
        price: 26.50,
        inStock: true,
      },
      {
        tenantId: bistroTenant.id,
        externalId: 'prod_102',
        name: 'Wood-fired Margherita',
        description: 'San Marzano tomatoes, Fior di Latte mozzarella, fresh basil.',
        price: 18.00,
        inStock: true,
      },
    ],
  });

  // 4. Create Tenant 2: Apex Dental Care (Clinic Blueprint)
  const dentalTenant = await prisma.tenant.create({
    data: {
      name: 'Apex Dental Care',
      slug: 'apex-dental',
      planId: 'starter',
      settings: {
        industry: 'clinic',
        systemPrompt: 'You are an empathetic medical receptionist for Apex Dental Care.',
        businessHours: { open: '08:00', close: '17:00' },
      },
    },
  });

  await prisma.membership.create({
    data: {
      tenantId: dentalTenant.id,
      userId: clinicUser.id,
      role: 'OWNER',
    },
  });

  // Create Channel for Clinic
  await prisma.channel.create({
    data: {
      tenantId: dentalTenant.id,
      type: 'WEB_WIDGET',
      name: 'Website Reception Widget',
      identifier: 'widget_apex_dental_01',
      credentials: {},
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log(`- Seeded Tenant 1: ${bistroTenant.name} (${bistroTenant.id})`);
  console.log(`- Seeded Tenant 2: ${dentalTenant.name} (${dentalTenant.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
