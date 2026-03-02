import express from 'express'
import { prisma } from '@mismo/db'
import { z } from 'zod'

const app = express()
app.use(express.json({ limit: '10mb' }))

const ScreenDef = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(['stack', 'tab', 'modal', 'drawer']).default('stack'),
})

const GenerateRequestSchema = z.object({
  buildId: z.string().min(1),
  projectName: z.string().min(1),
  bundleId: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/),
  designDna: z.object({
    mood: z.string().optional(),
    typography: z.record(z.unknown()).optional(),
    colors: z.record(z.unknown()).optional(),
  }).optional().default({}),
  prd: z.object({
    screens: z.array(ScreenDef).min(1),
    dataModels: z.array(z.object({ name: z.string() })).optional().default([]),
    features: z.object({
      realtime: z.boolean().optional().default(false),
      offline: z.boolean().optional().default(false),
      auth: z.boolean().optional().default(true),
    }).optional().default({}),
  }),
  architectureDecision: z.object({
    platform_strategy: z.enum(['expo-managed', 'expo-bare', 'fully-native']),
    native_modules_required: z.array(z.string()).optional().default([]),
  }),
})

type GenerateRequest = z.infer<typeof GenerateRequestSchema>

function selectStateManagement(prd: GenerateRequest['prd']): 'zustand' | 'redux-toolkit' {
  const screenCount = prd.screens.length
  const modelCount = prd.dataModels?.length ?? 0
  const hasRealtime = prd.features?.realtime ?? false
  const hasOffline = prd.features?.offline ?? false

  const complexityScore = screenCount + modelCount * 2 + (hasRealtime ? 3 : 0) + (hasOffline ? 3 : 0)
  return complexityScore > 10 ? 'redux-toolkit' : 'zustand'
}

function generateAppJson(projectName: string, bundleId: string): Record<string, unknown> {
  return {
    expo: {
      name: projectName,
      slug: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'automatic',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true,
        bundleIdentifier: bundleId,
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        package: bundleId,
      },
      web: { favicon: './assets/favicon.png' },
      plugins: ['expo-router'],
      scheme: projectName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      extra: {
        eas: { projectId: '' },
        router: { origin: '' },
      },
    },
  }
}

function generateProjectStructure(
  screens: z.infer<typeof ScreenDef>[],
): string[] {
  const files = [
    'app.json',
    'package.json',
    'tsconfig.json',
    'babel.config.js',
    'metro.config.js',
    'tailwind.config.js',
    'global.css',
    'app/_layout.tsx',
    'assets/icon.png',
    'assets/splash.png',
    'assets/adaptive-icon.png',
    'assets/favicon.png',
    'lib/supabase.ts',
    'lib/store.ts',
    'components/.gitkeep',
  ]

  const tabScreens = screens.filter((s) => s.type === 'tab')
  const stackScreens = screens.filter((s) => s.type !== 'tab')

  if (tabScreens.length > 0) {
    files.push('app/(tabs)/_layout.tsx')
    for (const screen of tabScreens) {
      files.push(`app/(tabs)/${screen.path.replace(/^\//, '')}.tsx`)
    }
  }

  for (const screen of stackScreens) {
    const cleanPath = screen.path.replace(/^\//, '')
    if (screen.type === 'modal') {
      files.push(`app/(modals)/${cleanPath}.tsx`)
    } else {
      files.push(`app/${cleanPath}.tsx`)
    }
  }

  return files.sort()
}

function generateNavigationConfig(
  screens: z.infer<typeof ScreenDef>[],
): Record<string, unknown> {
  const tabScreens = screens.filter((s) => s.type === 'tab')
  const stackScreens = screens.filter((s) => s.type === 'stack')
  const modalScreens = screens.filter((s) => s.type === 'modal')

  return {
    type: 'expo-router',
    groups: {
      '(tabs)': tabScreens.map((s) => ({
        name: s.name,
        path: s.path,
        icon: 'home-outline',
      })),
      '(modals)': modalScreens.map((s) => ({
        name: s.name,
        path: s.path,
        presentation: 'modal',
      })),
      root: stackScreens.map((s) => ({
        name: s.name,
        path: s.path,
      })),
    },
  }
}

function generatePackageJson(
  projectName: string,
  stateManagement: 'zustand' | 'redux-toolkit',
): Record<string, unknown> {
  const deps: Record<string, string> = {
    expo: '~52.0.0',
    'expo-router': '~4.0.0',
    'expo-status-bar': '~2.0.0',
    'expo-linking': '~7.0.0',
    'expo-constants': '~17.0.0',
    react: '18.3.1',
    'react-native': '0.76.0',
    'react-native-safe-area-context': '4.12.0',
    'react-native-screens': '~4.1.0',
    'react-native-paper': '^5.12.0',
    nativewind: '^4.0.0',
    tailwindcss: '^3.4.0',
    '@supabase/supabase-js': '^2.45.0',
    '@react-native-async-storage/async-storage': '1.23.1',
  }

  if (stateManagement === 'zustand') {
    deps['zustand'] = '^5.0.0'
  } else {
    deps['@reduxjs/toolkit'] = '^2.3.0'
    deps['react-redux'] = '^9.1.0'
  }

  return {
    name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '1.0.0',
    main: 'expo-router/entry',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web',
      lint: 'expo lint',
      'build:ios': 'eas build --platform ios',
      'build:android': 'eas build --platform android',
    },
    dependencies: deps,
    devDependencies: {
      '@types/react': '~18.3.0',
      typescript: '^5.7.0',
      '@babel/core': '^7.25.0',
    },
  }
}

function generateNativewindConfig(): Record<string, unknown> {
  return {
    content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
    presets: ['nativewind/preset'],
    theme: { extend: {} },
    plugins: [],
  }
}

function generateSupabaseClient(): string {
  return [
    "import 'react-native-url-polyfill/auto'",
    "import { createClient } from '@supabase/supabase-js'",
    "import AsyncStorage from '@react-native-async-storage/async-storage'",
    '',
    'const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!',
    'const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!',
    '',
    'export const supabase = createClient(supabaseUrl, supabaseAnonKey, {',
    '  auth: {',
    '    storage: AsyncStorage,',
    '    autoRefreshToken: true,',
    '    persistSession: true,',
    '    detectSessionInUrl: false,',
    '  },',
    '})',
    '',
  ].join('\n')
}

function generateStoreSetup(stateManagement: 'zustand' | 'redux-toolkit'): string {
  if (stateManagement === 'zustand') {
    return [
      "import { create } from 'zustand'",
      '',
      'interface AppState {',
      '  isLoading: boolean',
      '  setLoading: (loading: boolean) => void',
      '}',
      '',
      'export const useAppStore = create<AppState>((set) => ({',
      '  isLoading: false,',
      '  setLoading: (loading) => set({ isLoading: loading }),',
      '}))',
      '',
    ].join('\n')
  }

  return [
    "import { configureStore, createSlice } from '@reduxjs/toolkit'",
    "import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'",
    '',
    'const appSlice = createSlice({',
    "  name: 'app',",
    '  initialState: { isLoading: false },',
    '  reducers: {',
    '    setLoading: (state, action: { payload: boolean }) => {',
    '      state.isLoading = action.payload',
    '    },',
    '  },',
    '})',
    '',
    'export const { setLoading } = appSlice.actions',
    '',
    'export const store = configureStore({',
    '  reducer: { app: appSlice.reducer },',
    '})',
    '',
    'export type RootState = ReturnType<typeof store.getState>',
    'export type AppDispatch = typeof store.dispatch',
    'export const useAppDispatch: () => AppDispatch = useDispatch',
    'export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector',
    '',
  ].join('\n')
}

app.post('/generate', async (req, res) => {
  let buildId: string | undefined

  try {
    const parsed = GenerateRequestSchema.parse(req.body)
    buildId = parsed.buildId

    const stateManagement = selectStateManagement(parsed.prd)
    const appJson = generateAppJson(parsed.projectName, parsed.bundleId)
    const projectStructure = generateProjectStructure(parsed.prd.screens)
    const navigationConfig = generateNavigationConfig(parsed.prd.screens)
    const packageJson = generatePackageJson(parsed.projectName, stateManagement)
    const nativewindConfig = generateNativewindConfig()
    const supabaseConfig = generateSupabaseClient()
    const stateSetup = generateStoreSetup(stateManagement)

    res.json({
      success: true,
      projectStructure,
      appJson,
      navigationConfig,
      packageJson,
      nativewindConfig,
      stateManagement,
      stateSetup,
      supabaseConfig,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[mobile-scaffold] Error for build ${buildId}:`, message)

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
              errorLogs: [...(existing as any[]), { source: 'mobile-scaffold', error: message, timestamp: new Date().toISOString() }],
            },
          })
        }
      } catch {
        console.error('[mobile-scaffold] Failed to log error to Build record')
      }
    }

    res.status(400).json({ success: false, error: message })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mobile-scaffold-agent' })
})

const PORT = Number(process.env.PORT) || 3020
app.listen(PORT, () => {
  console.log(`[mobile-scaffold] listening on port ${PORT}`)
})
