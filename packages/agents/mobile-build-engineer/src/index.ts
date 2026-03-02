import express from 'express'
import { prisma } from '@mismo/db'
import { z } from 'zod'
import { execSync, spawn } from 'child_process'

const app = express()
app.use(express.json({ limit: '10mb' }))

const BuildRequestSchema = z.object({
  buildId: z.string().min(1),
  projectPath: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  buildProfile: z.enum(['development', 'preview', 'production']).default('production'),
  credentials: z.object({
    appleTeamId: z.string().optional(),
    appleApiKeyId: z.string().optional(),
    appleApiIssuerId: z.string().optional(),
    googleServiceAccountKeyPath: z.string().optional(),
    expoToken: z.string().optional(),
  }),
  submitToStore: z.boolean().default(true),
})

type BuildRequest = z.infer<typeof BuildRequestSchema>

const BUILD_TIMEOUT_MS = 30 * 60 * 1000

function getSSHConfig(platform: 'ios' | 'android'): { host: string; keyPath: string } {
  if (platform === 'ios') {
    return {
      host: process.env.STUDIO_2_SSH_HOST || '',
      keyPath: process.env.STUDIO_2_SSH_KEY || '',
    }
  }
  return {
    host: process.env.STUDIO_3_SSH_HOST || '',
    keyPath: process.env.STUDIO_3_SSH_KEY || '',
  }
}

function buildSSHCommand(sshConfig: { host: string; keyPath: string }, remoteCommand: string): string {
  const parts = [
    'ssh',
    '-o StrictHostKeyChecking=no',
    '-o ConnectTimeout=10',
  ]
  if (sshConfig.keyPath) {
    parts.push(`-i "${sshConfig.keyPath}"`)
  }
  parts.push(sshConfig.host)
  parts.push(`"${remoteCommand.replace(/"/g, '\\"')}"`)
  return parts.join(' ')
}

async function executeRemoteBuild(
  request: BuildRequest,
): Promise<{ buildId: string; artifactUrl: string; buildLog: string; status: string }> {
  const sshConfig = getSSHConfig(request.platform)

  if (!sshConfig.host) {
    throw new Error(
      `SSH host not configured for ${request.platform}. Set ${request.platform === 'ios' ? 'STUDIO_2_SSH_HOST' : 'STUDIO_3_SSH_HOST'}`,
    )
  }

  const envVars: string[] = []
  if (request.credentials.expoToken) {
    envVars.push(`EXPO_TOKEN=${request.credentials.expoToken}`)
  }
  if (request.credentials.appleTeamId) {
    envVars.push(`APPLE_TEAM_ID=${request.credentials.appleTeamId}`)
  }

  const envPrefix = envVars.length > 0 ? envVars.join(' ') + ' ' : ''
  const easBuildCmd = [
    `cd ${request.projectPath}`,
    `${envPrefix}npx eas-cli build`,
    `--platform ${request.platform}`,
    `--profile ${request.buildProfile}`,
    '--non-interactive',
    '--json',
  ].join(' ')

  const sshCommand = buildSSHCommand(sshConfig, easBuildCmd)
  const buildLog: string[] = []

  try {
    const output = await executeWithTimeout(sshCommand, BUILD_TIMEOUT_MS)
    buildLog.push(output)

    let parsedOutput: Record<string, unknown> = {}
    try {
      const jsonMatch = output.match(/\[?\{[\s\S]*\}\]?/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        parsedOutput = Array.isArray(parsed) ? parsed[0] : parsed
      }
    } catch {
      parsedOutput = { rawOutput: output }
    }

    const easBuildId = (parsedOutput.id as string) || `build-${Date.now()}`
    const artifactUrl = (parsedOutput.artifacts?.buildUrl as string) || ''

    return {
      buildId: easBuildId,
      artifactUrl,
      buildLog: buildLog.join('\n'),
      status: 'success',
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    buildLog.push(`BUILD FAILED: ${message}`)
    return {
      buildId: '',
      artifactUrl: '',
      buildLog: buildLog.join('\n'),
      status: 'failed',
    }
  }
}

async function submitToStore(
  platform: 'ios' | 'android',
  projectPath: string,
  credentials: BuildRequest['credentials'],
): Promise<{ submitted: boolean; message: string }> {
  const sshConfig = getSSHConfig(platform)

  if (!sshConfig.host) {
    return { submitted: false, message: 'SSH host not configured for submission' }
  }

  const envVars: string[] = []
  if (credentials.expoToken) {
    envVars.push(`EXPO_TOKEN=${credentials.expoToken}`)
  }
  const envPrefix = envVars.length > 0 ? envVars.join(' ') + ' ' : ''

  const submitCmd = `cd ${projectPath} && ${envPrefix}npx eas-cli submit --platform ${platform} --non-interactive --latest`
  const sshCommand = buildSSHCommand(sshConfig, submitCmd)

  try {
    const output = await executeWithTimeout(sshCommand, BUILD_TIMEOUT_MS)
    return {
      submitted: true,
      message: platform === 'ios'
        ? 'Submitted to TestFlight. Manual 2FA approval required for App Store release.'
        : 'Submitted to Google Play Internal testing track.',
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { submitted: false, message: `Submission failed: ${message}` }
  }
}

function executeWithTimeout(command: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const output = execSync(command, {
        timeout: timeoutMs,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      })
      resolve(output)
    } catch (error: unknown) {
      if (error instanceof Error && 'killed' in error && (error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
        reject(new Error(`Build timed out after ${timeoutMs / 60000} minutes`))
      } else {
        reject(error)
      }
    }
  })
}

app.post('/generate', async (req, res) => {
  let buildId: string | undefined

  try {
    const parsed = BuildRequestSchema.parse(req.body)
    buildId = parsed.buildId

    const buildResult = await executeRemoteBuild(parsed)

    let uploadResult = { submitted: false, message: 'Store submission skipped' }
    if (parsed.submitToStore && buildResult.status === 'success') {
      uploadResult = await submitToStore(
        parsed.platform,
        parsed.projectPath,
        parsed.credentials,
      )
    }

    const success = buildResult.status === 'success'
    res.json({
      success,
      buildId: buildResult.buildId,
      platform: parsed.platform,
      artifactUrl: buildResult.artifactUrl,
      buildLog: buildResult.buildLog,
      status: buildResult.status,
      uploadResult,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[mobile-build-engineer] Error for build ${buildId}:`, message)

    if (buildId) {
      try {
        const build = await prisma.build.findUnique({ where: { id: buildId } })
        if (build) {
          const existing = Array.isArray(build.errorLogs) ? build.errorLogs : []
          await prisma.build.update({
            where: { id: buildId },
            data: {
              status: 'FAILED',
              failureCount: { increment: 1 },
              errorLogs: [...(existing as any[]), { source: 'mobile-build-engineer', error: message, timestamp: new Date().toISOString() }],
            },
          })
        }
      } catch {
        console.error('[mobile-build-engineer] Failed to log error to Build record')
      }
    }

    res.status(400).json({ success: false, error: message })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mobile-build-engineer-agent' })
})

const PORT = Number(process.env.PORT) || 3022
app.listen(PORT, () => {
  console.log(`[mobile-build-engineer] listening on port ${PORT}`)
})
