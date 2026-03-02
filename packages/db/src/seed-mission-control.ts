import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Mission Control data...')

  // Ensure seed users exist
  const admin = await prisma.user.upsert({
    where: { supabaseAuthId: 'seed-admin-001' },
    update: {},
    create: { supabaseAuthId: 'seed-admin-001', role: 'ADMIN' },
  })

  const client = await prisma.user.upsert({
    where: { supabaseAuthId: 'seed-client-001' },
    update: {},
    create: { supabaseAuthId: 'seed-client-001', role: 'CLIENT' },
  })

  // Seed project archetypes
  const archetypes = await Promise.all([
    prisma.projectArchetype.upsert({
      where: { slug: 'landing_page' },
      update: {},
      create: {
        slug: 'landing_page',
        name: 'Landing Page',
        description: 'Single-page marketing site',
      },
    }),
    prisma.projectArchetype.upsert({
      where: { slug: 'saas_mvp' },
      update: {},
      create: {
        slug: 'saas_mvp',
        name: 'SaaS MVP',
        description: 'Full-stack SaaS application',
      },
    }),
    prisma.projectArchetype.upsert({
      where: { slug: 'ecommerce' },
      update: {},
      create: {
        slug: 'ecommerce',
        name: 'E-Commerce',
        description: 'Online store with payments',
      },
    }),
  ])

  // Seed agents
  const agentTypes = ['DATABASE', 'BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'COORDINATOR'] as const
  const studios = ['studio-1', 'studio-2', 'studio-3']

  for (const type of agentTypes) {
    const studio = studios[Math.floor(Math.random() * studios.length)]
    await prisma.agent.upsert({
      where: { id: `agent-${type.toLowerCase()}` },
      update: { lastHeartbeat: new Date() },
      create: {
        id: `agent-${type.toLowerCase()}`,
        type,
        currentLoad: Math.floor(Math.random() * 5),
        studioLocation: studio,
        status: 'ACTIVE',
      },
    })
  }

  // Seed commissions in different statuses
  const statuses = ['DRAFT', 'DISCOVERY', 'IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED'] as const
  const emails = [
    'alice@startup.io',
    'bob@enterprise.com',
    'carol@agency.co',
    'dave@fintech.app',
    'eve@healthtech.org',
    'frank@edtech.xyz',
  ]

  const commissions = []
  for (let i = 0; i < emails.length; i++) {
    const commission = await prisma.commission.create({
      data: {
        clientEmail: emails[i],
        status: statuses[i],
        archetypeId: archetypes[i % archetypes.length].id,
        paymentState: i < 2 ? 'UNPAID' : i < 4 ? 'PARTIAL' : 'FINAL',
        userId: client.id,
        feasibilityScore: 6 + Math.random() * 4,
        riskAssessment: {
          items: [
            'Third-party API dependency',
            'Complex data migration required',
          ],
        },
        prdJson: {
          name: `Project ${emails[i].split('@')[0]}`,
          description: `A ${archetypes[i % archetypes.length].name} project for ${emails[i]}`,
          features: [
            'User authentication',
            'Dashboard',
            'API integration',
            'Payment processing',
          ],
        },
      },
    })
    commissions.push(commission)
  }

  // Seed builds for IN_PROGRESS and COMPLETED commissions
  const buildStatuses = ['SUCCESS', 'RUNNING', 'FAILED', 'SUCCESS', 'PENDING'] as const
  for (let i = 0; i < commissions.length; i++) {
    if (['IN_PROGRESS', 'COMPLETED', 'ESCALATED'].includes(commissions[i].status)) {
      await prisma.build.create({
        data: {
          commissionId: commissions[i].id,
          status: commissions[i].status === 'COMPLETED' ? 'SUCCESS' : buildStatuses[i % buildStatuses.length],
          studioAssignment: studios[i % studios.length],
          kimiqTokensUsed: Math.floor(10000 + Math.random() * 50000),
          failureCount: commissions[i].status === 'ESCALATED' ? 3 : Math.floor(Math.random() * 2),
          errorLogs: commissions[i].status === 'ESCALATED'
            ? { errors: ['Build timeout on frontend step', 'Contract mismatch'] }
            : undefined,
        },
      })
    }
  }

  // Seed studio metrics (time series, last 30 readings per studio)
  const now = Date.now()
  const studioNames = ['Studio 1 (Main)', 'Studio 2 (Build)', 'Studio 3 (QA)']

  for (let s = 0; s < studios.length; s++) {
    const metrics = []
    for (let i = 29; i >= 0; i--) {
      metrics.push({
        studioId: studios[s],
        studioName: studioNames[s],
        cpuPercent: 20 + Math.random() * 60,
        ramPercent: 40 + Math.random() * 40,
        diskPercent: 30 + Math.random() * 20,
        networkIn: Math.random() * 1024 * 1024 * 10,
        networkOut: Math.random() * 1024 * 1024 * 5,
        queueDepth: Math.floor(Math.random() * 8),
        createdAt: new Date(now - i * 60000),
      })
    }
    await prisma.studioMetrics.createMany({ data: metrics })
  }

  // Seed build logs for error heatmap
  const stages = ['database', 'backend', 'frontend', 'devops', 'testing']
  const logStatuses = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED', 'ERROR']
  const projects = await prisma.project.findMany({ take: 1 })

  if (projects.length > 0) {
    const logs = []
    for (let i = 0; i < 40; i++) {
      logs.push({
        projectId: projects[0].id,
        stage: stages[Math.floor(Math.random() * stages.length)],
        status: logStatuses[Math.floor(Math.random() * logStatuses.length)],
        output: `Step completed at ${new Date().toISOString()}`,
      })
    }
    await prisma.buildLog.createMany({ data: logs })
  }

  // Seed deliveries for quality scores
  const completedBuilds = await prisma.build.findMany({
    where: { status: 'SUCCESS' },
    take: 3,
  })
  for (const build of completedBuilds) {
    await prisma.delivery.create({
      data: {
        commissionId: build.commissionId,
        buildId: build.id,
        repoName: `project-${build.id.slice(0, 6)}`,
        githubOrg: 'mismo-builds',
        status: 'COMPLETED',
        secretScanPassed: Math.random() > 0.1,
        bmadChecksPassed: Math.random() > 0.2,
        contractCheckPassed: Math.random() > 0.15,
      },
    })
  }

  console.log('Mission Control seed data created successfully')
  console.log(`  - ${commissions.length} commissions`)
  console.log(`  - ${agentTypes.length} agents`)
  console.log(`  - 90 studio metric readings (30 per studio)`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
