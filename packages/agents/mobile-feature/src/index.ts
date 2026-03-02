import express from 'express'
import { prisma } from '@mismo/db'
import { z } from 'zod'

const app = express()
app.use(express.json({ limit: '10mb' }))

const ScreenSpec = z.object({
  name: z.string(),
  path: z.string(),
  description: z.string().optional(),
  dataModel: z.string().optional(),
  actions: z.array(z.string()).optional().default([]),
})

const GenerateRequestSchema = z.object({
  buildId: z.string().min(1),
  scaffoldOutput: z.object({
    stateManagement: z.enum(['zustand', 'redux-toolkit']),
    navigationConfig: z.record(z.unknown()),
  }),
  prd: z.object({
    screens: z.array(ScreenSpec).min(1),
    dataModels: z.array(z.object({
      name: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().optional().default(true),
      })),
    })).optional().default([]),
    nativeFeatures: z.array(z.enum(['camera', 'location', 'notifications', 'biometrics'])).optional().default([]),
  }),
  designDna: z.object({
    mood: z.string().optional(),
    colors: z.record(z.unknown()).optional(),
    typography: z.record(z.unknown()).optional(),
  }).optional().default({}),
  componentLibrary: z.enum(['react-native-paper', 'tamagui']).default('react-native-paper'),
})

type GenerateRequest = z.infer<typeof GenerateRequestSchema>

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase())
}

function generateScreen(
  screen: z.infer<typeof ScreenSpec>,
  designDna: GenerateRequest['designDna'],
  componentLibrary: string,
): { path: string; code: string } {
  const componentName = toPascalCase(screen.name) + 'Screen'
  const mood = designDna?.mood || 'neutral'
  const colors = (designDna?.colors || {}) as Record<string, string>
  const primary = colors.primary || '#3b82f6'

  const paperImports = componentLibrary === 'react-native-paper'
    ? "import { Surface, Text, Button, useTheme } from 'react-native-paper'"
    : "import { Text, Button, YStack } from 'tamagui'"

  const code = [
    "import React from 'react'",
    "import { View, ScrollView, StyleSheet } from 'react-native'",
    paperImports,
    '',
    `const designTokens = { mood: '${mood}', primary: '${primary}' } as const`,
    '',
    `export default function ${componentName}() {`,
    componentLibrary === 'react-native-paper'
      ? '  const theme = useTheme()'
      : '',
    '  return (',
    '    <ScrollView style={styles.container}>',
    componentLibrary === 'react-native-paper'
      ? [
          '      <Surface style={styles.content} elevation={1}>',
          `        <Text variant="headlineMedium">${screen.name}</Text>`,
          screen.description
            ? `        <Text variant="bodyLarge">${screen.description}</Text>`
            : '',
          ...screen.actions.map(
            (action) =>
              `        <Button mode="contained" style={styles.button} onPress={() => {}}>${action}</Button>`,
          ),
          '      </Surface>',
        ].filter(Boolean).join('\n')
      : [
          '      <YStack padding="$4" gap="$3">',
          `        <Text fontSize="$8">${screen.name}</Text>`,
          screen.description
            ? `        <Text fontSize="$4">${screen.description}</Text>`
            : '',
          ...screen.actions.map(
            (action) =>
              `        <Button onPress={() => {}}>${action}</Button>`,
          ),
          '      </YStack>',
        ].filter(Boolean).join('\n'),
    '    </ScrollView>',
    '  )',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  container: { flex: 1 },',
    `  content: { margin: 16, padding: 16, borderRadius: 12 },`,
    '  button: { marginTop: 8 },',
    '})',
    '',
  ].join('\n')

  return { path: `app/${screen.path.replace(/^\//, '')}.tsx`, code }
}

function generateComponent(
  name: string,
  designDna: GenerateRequest['designDna'],
  componentLibrary: string,
): { path: string; code: string } {
  const componentName = toPascalCase(name)
  const mood = designDna?.mood || 'neutral'

  const code = componentLibrary === 'react-native-paper'
    ? [
        "import React from 'react'",
        "import { View, StyleSheet } from 'react-native'",
        "import { Text, Surface } from 'react-native-paper'",
        '',
        `export interface ${componentName}Props {`,
        '  children?: React.ReactNode',
        '}',
        '',
        `export function ${componentName}({ children }: ${componentName}Props) {`,
        '  return (',
        '    <Surface style={styles.container} elevation={1}>',
        `      <Text variant="titleMedium">${name}</Text>`,
        '      <View>{children}</View>',
        '    </Surface>',
        '  )',
        '}',
        '',
        'const styles = StyleSheet.create({',
        '  container: { padding: 16, borderRadius: 12, margin: 8 },',
        '})',
        '',
      ].join('\n')
    : [
        "import React from 'react'",
        "import { Text, YStack } from 'tamagui'",
        '',
        `export interface ${componentName}Props {`,
        '  children?: React.ReactNode',
        '}',
        '',
        `export function ${componentName}({ children }: ${componentName}Props) {`,
        '  return (',
        '    <YStack padding="$4" borderRadius="$4" margin="$2">',
        `      <Text fontSize="$6">${name}</Text>`,
        '      {children}',
        '    </YStack>',
        '  )',
        '}',
        '',
      ].join('\n')

  return { path: `components/${componentName}.tsx`, code }
}

function resolveNativePermissions(
  features: string[],
): { permissions: string[]; plugins: string[]; imports: string[] } {
  const permissions: string[] = []
  const plugins: string[] = []
  const imports: string[] = []

  if (features.includes('camera')) {
    permissions.push('android.permission.CAMERA')
    plugins.push('expo-camera')
    imports.push("import { CameraView, useCameraPermissions } from 'expo-camera'")
  }

  if (features.includes('location')) {
    permissions.push('android.permission.ACCESS_FINE_LOCATION')
    permissions.push('android.permission.ACCESS_COARSE_LOCATION')
    plugins.push('expo-location')
    imports.push("import * as Location from 'expo-location'")
  }

  if (features.includes('notifications')) {
    permissions.push('android.permission.POST_NOTIFICATIONS')
    plugins.push('expo-notifications')
    imports.push("import * as Notifications from 'expo-notifications'")
  }

  if (features.includes('biometrics')) {
    plugins.push('expo-local-authentication')
    imports.push("import * as LocalAuthentication from 'expo-local-authentication'")
  }

  return { permissions, plugins, imports }
}

function generateApiClient(
  dataModels: GenerateRequest['prd']['dataModels'],
): string {
  const lines = [
    "import { supabase } from './supabase'",
    '',
  ]

  for (const model of dataModels) {
    const tableName = model.name.toLowerCase().replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
    const typeName = toPascalCase(model.name)

    lines.push(`export interface ${typeName} {`)
    for (const field of model.fields) {
      const tsType = field.type === 'uuid' || field.type === 'string' || field.type === 'text'
        ? 'string'
        : field.type === 'number' || field.type === 'integer' || field.type === 'float'
          ? 'number'
          : field.type === 'boolean'
            ? 'boolean'
            : 'unknown'
      const optional = field.required ? '' : '?'
      lines.push(`  ${field.name}${optional}: ${tsType}`)
    }
    lines.push('}', '')

    lines.push(`export async function fetch${typeName}s() {`)
    lines.push(`  const { data, error } = await supabase.from('${tableName}').select('*')`)
    lines.push('  if (error) throw error')
    lines.push(`  return data as ${typeName}[]`)
    lines.push('}', '')

    lines.push(`export async function fetch${typeName}ById(id: string) {`)
    lines.push(`  const { data, error } = await supabase.from('${tableName}').select('*').eq('id', id).single()`)
    lines.push('  if (error) throw error')
    lines.push(`  return data as ${typeName}`)
    lines.push('}', '')
  }

  return lines.join('\n')
}

function validateGeneratedCode(
  screens: Array<{ path: string; code: string }>,
  components: Array<{ path: string; code: string }>,
  apiClient: string,
): string[] {
  const errors: string[] = []
  const allCode = [...screens, ...components]

  for (const file of allCode) {
    if (file.code.includes(': any') || file.code.includes('<any>') || file.code.includes('as any')) {
      errors.push(`${file.path} contains unsafe 'any' type`)
    }
  }

  if (apiClient.includes(': any') || apiClient.includes('<any>')) {
    errors.push("API client contains unsafe 'any' type")
  }

  return errors
}

app.post('/generate', async (req, res) => {
  let buildId: string | undefined

  try {
    const parsed = GenerateRequestSchema.parse(req.body)
    buildId = parsed.buildId

    const screens = parsed.prd.screens.map((s) =>
      generateScreen(s, parsed.designDna, parsed.componentLibrary),
    )

    const uniqueModels = [...new Set(
      parsed.prd.screens
        .filter((s) => s.dataModel)
        .map((s) => s.dataModel!),
    )]
    const components = uniqueModels.map((name) =>
      generateComponent(name, parsed.designDna, parsed.componentLibrary),
    )

    const nativePermissions = resolveNativePermissions(parsed.prd.nativeFeatures)
    const apiClient = generateApiClient(parsed.prd.dataModels)

    const validationErrors = validateGeneratedCode(screens, components, apiClient)
    if (validationErrors.length > 0) {
      const build = await prisma.build.findUnique({ where: { id: buildId } })
      if (build) {
        const existing = Array.isArray(build.errorLogs) ? build.errorLogs : []
        await prisma.build.update({
          where: { id: buildId },
          data: {
            failureCount: { increment: 1 },
            errorLogs: [...(existing as any[]), { source: 'mobile-feature', errors: validationErrors, timestamp: new Date().toISOString() }],
          },
        })
      }
      res.status(400).json({ success: false, error: 'Validation failed', details: validationErrors })
      return
    }

    res.json({
      success: true,
      screens,
      components,
      nativePermissions,
      apiClient,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[mobile-feature] Error for build ${buildId}:`, message)

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
              errorLogs: [...(existing as any[]), { source: 'mobile-feature', error: message, timestamp: new Date().toISOString() }],
            },
          })
        }
      } catch {
        console.error('[mobile-feature] Failed to log error to Build record')
      }
    }

    res.status(400).json({ success: false, error: message })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mobile-feature-agent' })
})

const PORT = Number(process.env.PORT) || 3021
app.listen(PORT, () => {
  console.log(`[mobile-feature] listening on port ${PORT}`)
})
