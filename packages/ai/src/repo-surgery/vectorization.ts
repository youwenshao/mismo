import { QdrantClient } from '@qdrant/js-client-rest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import type { CodeChunk, VectorizationResult } from './schema'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'vendor',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
])

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.svg',
  '.webp',
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mov',
  '.mkv',
  '.flac',
  '.ogg',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.rar',
  '.7z',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.o',
  '.a',
  '.pyc',
  '.class',
  '.jar',
  '.war',
  '.lock',
  '.wasm',
])

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.dart': 'dart',
  '.scala': 'scala',
  '.r': 'r',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.proto': 'protobuf',
  '.prisma': 'prisma',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.tf': 'terraform',
  '.hcl': 'hcl',
  '.lua': 'lua',
  '.el': 'elisp',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.ml': 'ocaml',
  '.mli': 'ocaml',
  '.clj': 'clojure',
  '.cljs': 'clojure',
  '.nim': 'nim',
  '.zig': 'zig',
  '.v': 'v',
  '.sol': 'solidity',
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return LANGUAGE_MAP[ext] ?? 'unknown'
}

function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

// ─── CodeChunker ──────────────────────────────────────────────────────────────

export class CodeChunker {
  private chunkSize: number
  private overlap: number

  constructor(chunkSize = 100, overlap = 20) {
    this.chunkSize = chunkSize
    this.overlap = overlap
  }

  async chunkDirectory(dir: string): Promise<CodeChunk[]> {
    const files = await this.collectFiles(dir)
    const chunks: CodeChunk[] = []

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const relativePath = path.relative(dir, filePath)
        const language = detectLanguage(filePath)
        const fileChunks = this.splitIntoChunks(content, relativePath, language)
        chunks.push(...fileChunks)
      } catch {
        // Skip files that can't be read (permissions, encoding, etc.)
      }
    }

    return chunks
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    await this.walkDir(dir, files)
    return files
  }

  private async walkDir(dir: string, files: string[]): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && SKIP_DIRS.has(entry.name)) continue
      if (SKIP_DIRS.has(entry.name)) continue

      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        await this.walkDir(fullPath, files)
      } else if (entry.isFile() && !isBinaryFile(entry.name)) {
        files.push(fullPath)
      }
    }
  }

  private splitIntoChunks(content: string, filePath: string, language: string): CodeChunk[] {
    const lines = content.split('\n')
    if (lines.length === 0) return []

    const chunks: CodeChunk[] = []
    const step = this.chunkSize - this.overlap

    for (let i = 0; i < lines.length; i += step) {
      const end = Math.min(i + this.chunkSize, lines.length)
      const chunkLines = lines.slice(i, end)
      const chunkContent = chunkLines.join('\n')

      if (chunkContent.trim().length === 0) continue

      chunks.push({
        filePath,
        language,
        startLine: i + 1,
        endLine: end,
        content: chunkContent,
      })

      if (end >= lines.length) break
    }

    return chunks
  }
}

// ─── CodeEmbedder ─────────────────────────────────────────────────────────────

interface EmbedderConfig {
  model?: string
  dimensions?: number
  apiKey?: string
}

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>
  usage: { prompt_tokens: number; total_tokens: number }
}

const EMBEDDING_BATCH_SIZE = 100

export class CodeEmbedder {
  private model: string
  private dimensions: number
  private apiKey: string

  constructor(config: EmbedderConfig = {}) {
    this.model = config.model ?? 'text-embedding-3-large'
    this.dimensions = config.dimensions ?? 3072
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY or pass apiKey in config.')
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = new Array(texts.length)

    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE)
      const response = await this.callEmbeddingAPI(batch)

      for (const item of response.data) {
        results[i + item.index] = item.embedding
      }
    }

    return results
  }

  async embedSingle(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text])
    return embedding
  }

  private async callEmbeddingAPI(input: string[]): Promise<OpenAIEmbeddingResponse> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input,
        dimensions: this.dimensions,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenAI Embeddings API error (${response.status}): ${errorBody}`)
    }

    return (await response.json()) as OpenAIEmbeddingResponse
  }
}

// ─── CodeVectorStore ──────────────────────────────────────────────────────────

interface VectorStoreConfig {
  qdrantUrl?: string
  qdrantApiKey?: string
}

export class CodeVectorStore {
  private client: QdrantClient

  constructor(config: VectorStoreConfig = {}) {
    this.client = new QdrantClient({
      url: config.qdrantUrl ?? process.env.QDRANT_URL ?? 'http://localhost:6333',
      apiKey: config.qdrantApiKey ?? process.env.QDRANT_API_KEY ?? '',
    })
  }

  async createCollection(surgeryId: string, dimensions: number): Promise<string> {
    const collectionName = `repo_surgery_${surgeryId}`

    const collections = await this.client.getCollections()
    const exists = collections.collections.some((c) => c.name === collectionName)

    if (!exists) {
      await this.client.createCollection(collectionName, {
        vectors: {
          size: dimensions,
          distance: 'Cosine',
        },
      })
    }

    return collectionName
  }

  async insertChunks(
    collectionName: string,
    chunks: CodeChunk[],
    embeddings: number[][],
  ): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error(`Mismatch: ${chunks.length} chunks but ${embeddings.length} embeddings`)
    }

    const batchSize = 100
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize)
      const batchEmbeddings = embeddings.slice(i, i + batchSize)

      const points = batchChunks.map((chunk, idx) => ({
        id: i + idx,
        vector: batchEmbeddings[idx],
        payload: {
          filePath: chunk.filePath,
          language: chunk.language,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          content: chunk.content,
          functionName: chunk.functionName,
          className: chunk.className,
        },
      }))

      await this.client.upsert(collectionName, {
        wait: true,
        points,
      })
    }
  }

  async search(
    collectionName: string,
    queryEmbedding: number[],
    limit = 10,
    filter?: { language?: string; filePath?: string },
  ): Promise<Array<{ chunk: CodeChunk; score: number }>> {
    const qdrantFilter = this.buildFilter(filter)

    const results = await this.client.search(collectionName, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
      ...(qdrantFilter && { filter: qdrantFilter }),
    })

    return results.map((result) => ({
      chunk: {
        filePath: result.payload?.filePath as string,
        language: result.payload?.language as string,
        startLine: result.payload?.startLine as number,
        endLine: result.payload?.endLine as number,
        content: result.payload?.content as string,
        functionName: result.payload?.functionName as string | undefined,
        className: result.payload?.className as string | undefined,
      },
      score: result.score,
    }))
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.client.deleteCollection(collectionName)
  }

  private buildFilter(filter?: {
    language?: string
    filePath?: string
  }): { must: Array<{ key: string; match: { value: string } }> } | undefined {
    if (!filter) return undefined

    const must: Array<{ key: string; match: { value: string } }> = []

    if (filter.language) {
      must.push({ key: 'language', match: { value: filter.language } })
    }
    if (filter.filePath) {
      must.push({ key: 'filePath', match: { value: filter.filePath } })
    }

    return must.length > 0 ? { must } : undefined
  }
}

// ─── Orchestration ────────────────────────────────────────────────────────────

export async function vectorizeRepo(
  surgeryId: string,
  cloneDir: string,
): Promise<VectorizationResult> {
  const chunker = new CodeChunker()
  const embedder = new CodeEmbedder()
  const store = new CodeVectorStore()

  const chunks = await chunker.chunkDirectory(cloneDir)

  if (chunks.length === 0) {
    const collectionName = await store.createCollection(surgeryId, embedder['dimensions'])
    return {
      surgeryId,
      collectionName,
      chunkCount: 0,
      embeddingModel: embedder['model'],
      dimensions: embedder['dimensions'],
    }
  }

  const texts = chunks.map((c) => c.content)
  const embeddings = await embedder.embedBatch(texts)

  const collectionName = await store.createCollection(surgeryId, embedder['dimensions'])
  await store.insertChunks(collectionName, chunks, embeddings)

  return {
    surgeryId,
    collectionName,
    chunkCount: chunks.length,
    embeddingModel: embedder['model'],
    dimensions: embedder['dimensions'],
  }
}
