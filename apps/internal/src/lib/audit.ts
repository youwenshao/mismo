import { prisma, type Prisma } from '@mismo/db'

export async function logAudit(params: {
  userId: string
  action: string
  resource: string
  resourceId: string
  metadata?: Prisma.InputJsonValue
}) {
  return prisma.auditLog.create({ data: params })
}
