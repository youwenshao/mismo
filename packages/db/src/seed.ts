import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { supabaseAuthId: 'seed-admin-001' },
    update: {},
    create: {
      supabaseAuthId: 'seed-admin-001',
      role: 'ADMIN',
    },
  })

  const engineer = await prisma.user.upsert({
    where: { supabaseAuthId: 'seed-engineer-001' },
    update: {},
    create: {
      supabaseAuthId: 'seed-engineer-001',
      role: 'ENGINEER',
    },
  })

  const client = await prisma.user.upsert({
    where: { supabaseAuthId: 'seed-client-001' },
    update: {},
    create: {
      supabaseAuthId: 'seed-client-001',
      role: 'CLIENT',
    },
  })

  console.log('Seeded users:', { admin: admin.id, engineer: engineer.id, client: client.id })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
