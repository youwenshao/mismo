import express from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())

// Dummy topological sort function
function topologicalSort(agents: any[]) {
  return agents.sort((a, b) => a.id.localeCompare(b.id))
}

app.post('/sort', async (req, res) => {
  const { buildId, agents } = req.body

  if (!agents || !Array.isArray(agents)) {
    return res.status(400).json({ success: false, error: 'agents array is required' })
  }

  try {
    const sorted = topologicalSort(agents)

    if (buildId) {
      await prisma.build.update({
        where: { id: buildId },
        data: {
          executionIds: sorted.map((a) => a.id),
        },
      })
    }

    return res.json({ success: true, sorted })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`GSD Dependency Checker listening on port ${PORT}`))
