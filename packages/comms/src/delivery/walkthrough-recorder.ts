import puppeteer, { type Page } from 'puppeteer'
import { spawn } from 'child_process'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface RecordingOptions {
  targetUrl: string
  routes: string[]
  outputDir?: string
  viewportWidth?: number
  viewportHeight?: number
  delayBetweenRoutes?: number
  maxDuration?: number
}

export interface RecordingResult {
  videoPath: string
  duration: number
  routesVisited: string[]
}

export async function recordWalkthrough(options: RecordingOptions): Promise<RecordingResult> {
  const {
    targetUrl,
    routes,
    outputDir = '/tmp/mismo-recordings',
    viewportWidth = 1280,
    viewportHeight = 720,
    delayBetweenRoutes = 3000,
    maxDuration = 120000,
  } = options

  mkdirSync(outputDir, { recursive: true })

  const sessionId = randomUUID()
  const framesDir = join(outputDir, `frames-${sessionId}`)
  const outputPath = join(outputDir, `walkthrough-${sessionId}.mp4`)
  mkdirSync(framesDir, { recursive: true })

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--window-size=${viewportWidth},${viewportHeight}`,
    ],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: viewportWidth, height: viewportHeight })

  const routesVisited: string[] = []
  let frameIndex = 0
  const startTime = Date.now()

  try {
    for (const route of routes) {
      if (Date.now() - startTime > maxDuration) break

      const url = route.startsWith('http') ? route : `${targetUrl}${route}`

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 })
        routesVisited.push(route)
      } catch {
        console.warn(`[walkthrough] Failed to navigate to ${url}, skipping`)
        continue
      }

      await delay(1000)

      const captureFrames = Math.ceil(delayBetweenRoutes / 500)
      for (let i = 0; i < captureFrames; i++) {
        const framePath = join(framesDir, `frame-${String(frameIndex).padStart(6, '0')}.png`)
        await page.screenshot({ path: framePath })
        frameIndex++
        await delay(500)
      }

      await autoScroll(page)

      const scrollFrames = 4
      for (let i = 0; i < scrollFrames; i++) {
        const framePath = join(framesDir, `frame-${String(frameIndex).padStart(6, '0')}.png`)
        await page.screenshot({ path: framePath })
        frameIndex++
        await delay(500)
      }
    }
  } finally {
    await browser.close()
  }

  await framesToVideo(framesDir, outputPath, viewportWidth, viewportHeight)

  return {
    videoPath: outputPath,
    duration: Date.now() - startTime,
    routesVisited,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const distance = 200
    const delay = 100
    const maxScrolls = 10
    let scrolls = 0

    while (scrolls < maxScrolls) {
      const before = window.scrollY
      window.scrollBy(0, distance)
      await new Promise((r) => setTimeout(r, delay))
      if (window.scrollY === before) break
      scrolls++
    }
  })
}

function framesToVideo(
  framesDir: string,
  outputPath: string,
  width: number,
  height: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-framerate', '2',
      '-i', join(framesDir, 'frame-%06d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-vf', `scale=${width}:${height}`,
      '-preset', 'fast',
      outputPath,
    ])

    ffmpeg.stderr.on('data', (data: Buffer) => {
      console.log(`[ffmpeg] ${data.toString()}`)
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`))
      }
    })

    ffmpeg.on('error', reject)
  })
}
