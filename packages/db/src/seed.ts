import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mismo.dev' },
    update: {},
    create: {
      email: 'admin@mismo.dev',
      name: 'Admin',
      role: 'ADMIN',
      ageVerified: true,
      ageTier: 'ADULT',
    },
  })

  const engineer = await prisma.user.upsert({
    where: { email: 'engineer@mismo.dev' },
    update: {},
    create: {
      email: 'engineer@mismo.dev',
      name: 'Dev Engineer',
      role: 'ENGINEER',
      ageVerified: true,
      ageTier: 'ADULT',
    },
  })

  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      name: 'Test Client',
      role: 'CLIENT',
      ageVerified: true,
      ageTier: 'ADULT',
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
