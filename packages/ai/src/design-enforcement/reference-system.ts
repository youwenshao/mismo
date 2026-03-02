import { QdrantClient } from '@qdrant/js-client-rest'

// Initialize Qdrant Client (in production, use environment variables)
const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333'
const qdrantApiKey = process.env.QDRANT_API_KEY || ''

const client = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
})

const COLLECTION_NAME = 'awwwards_references'

export async function setupCollection() {
  try {
    const collections = await client.getCollections()
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME)

    if (!exists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // Assuming OpenAI text-embedding-3-small or similar
          distance: 'Cosine',
        },
      })
      console.log(`Collection ${COLLECTION_NAME} created.`)
    }
  } catch (error) {
    console.error('Error setting up Qdrant collection:', error)
  }
}

export interface ReferenceData extends Record<string, unknown> {
  id: string
  componentId: string
  description: string
  imageUrl: string
}

export async function insertReferences(
  references: { id: string | number; vector: number[]; payload: ReferenceData }[],
) {
  try {
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: references,
    })
    console.log(`Inserted ${references.length} references into ${COLLECTION_NAME}.`)
  } catch (error) {
    console.error('Error inserting references:', error)
  }
}

export async function findReference(queryEmbedding: number[], limit: number = 3) {
  try {
    const searchResult = await client.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: limit,
      with_payload: true,
    })

    return searchResult.map((result) => ({
      id: result.id,
      score: result.score,
      payload: result.payload as unknown as ReferenceData,
    }))
  } catch (error) {
    console.error('Error finding references:', error)
    return []
  }
}

// Helper to generate embedding (Mock for now, should use OpenAI or similar)
export async function generateMockEmbedding(text: string): Promise<number[]> {
  // Return a dummy embedding vector of size 1536
  return Array(1536)
    .fill(0)
    .map(() => Math.random() - 0.5)
}

export async function queryReferencesByText(prompt: string) {
  const embedding = await generateMockEmbedding(prompt)
  return await findReference(embedding)
}
