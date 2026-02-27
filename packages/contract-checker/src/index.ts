import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.post('/check', async (req, res) => {
  const { buildId, astData } = req.body;
  
  try {
    // Simple AST analysis dummy logic
    const isValid = astData && astData.interfacesMatch === true;
    
    if (!isValid) {
      if (buildId) {
        const build = await prisma.build.findUnique({ where: { id: buildId } });
        if (build) {
          const newLogs = Array.isArray(build.errorLogs) ? build.errorLogs : [];
          await prisma.build.update({
            where: { id: buildId },
            data: {
              status: 'FAILED',
              failureCount: { increment: 1 },
              errorLogs: [...newLogs, { source: 'contract-checker', error: 'Interface mismatch' }]
            }
          });
        }
      }
      return res.status(400).json({ success: false, error: 'Interface mismatch' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Contract Checker listening on port ${PORT}`));
