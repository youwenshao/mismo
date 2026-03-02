import express from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())

const prdSchema = z.object({
  tech_stack: z.any(),
  api_contracts: z.any(),
  data_boundaries: z.any(),
  feasibility_score: z.number().min(0).max(100),
})

app.post('/validate', async (req, res) => {
  const { buildId, prd } = req.body

  try {
    const parsed = prdSchema.safeParse(prd)

    if (!parsed.success) {
      if (buildId) {
        const build = await prisma.build.findUnique({ where: { id: buildId } })
        if (build) {
          const newLogs = Array.isArray(build.errorLogs) ? build.errorLogs : []
          await prisma.build.update({
            where: { id: buildId },
            data: {
              status: 'FAILED',
              failureCount: { increment: 1 },
              errorLogs: [...newLogs, { source: 'bmad-validator', errors: parsed.error.errors }],
            },
          })
        }
      }
      return res.status(400).json({ success: false, errors: parsed.error.errors })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`BMAD Validator listening on port ${PORT}`))
