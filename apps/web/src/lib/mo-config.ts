import { prisma } from '@mismo/db'

interface RawConfig {
  key: string
  value: unknown
}

export interface MoRuntimeConfig {
  providerId?: string
  modelId?: string
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export async function getMoRuntimeConfig(): Promise<MoRuntimeConfig> {
  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: ['mo.provider', 'mo.model'] } },
    select: { key: true, value: true },
  })

  const lookup = new Map(configs.map((c: RawConfig) => [c.key, c.value]))

  return {
    providerId: readString(lookup.get('mo.provider')),
    modelId: readString(lookup.get('mo.model')),
  }
}
