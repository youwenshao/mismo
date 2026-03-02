import { NextRequest, NextResponse } from 'next/server'
import {
  generateDeliveryDocuments,
  documentFilesFromGenerated,
  GitHubClient,
  type DocGeneratorInput,
} from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.buildId || !body.commissionId) {
      return NextResponse.json(
        { error: 'Missing "buildId" or "commissionId"' },
        { status: 400 },
      )
    }

    const prdJson = body.prdJson ?? {}

    const docInput: DocGeneratorInput = {
      projectName: prdJson.name ?? body.repoName ?? 'Project',
      prdJson: {
        archTemplate: prdJson.archTemplate,
        stack: prdJson.stack,
        description: prdJson.description,
        userStories: prdJson.userStories,
        dataBoundaries: prdJson.dataBoundaries,
        apiSpec: prdJson.apiSpec,
        constraints: prdJson.constraints,
      },
      buildMetadata: {
        buildId: body.buildId,
        studioAssignment: body.studioAssignment,
        githubUrl: body.githubUrl,
        vercelUrl: body.vercelUrl,
        completedAt: new Date().toISOString(),
      },
      devOpsOutput: body.devOpsOutput,
    }

    const docs = generateDeliveryDocuments(docInput)
    const docFiles = documentFilesFromGenerated(docs)

    if (body.repoOwner && body.repoName) {
      try {
        const github = new GitHubClient()
        const treeFiles = docFiles.map((f) => ({ path: f.path, content: f.content }))
        treeFiles.push({ path: 'CONTRACTS.json', content: docs.apiContracts })
        treeFiles.push({ path: 'ARCHITECTURE.md', content: docs.architectureDecisionRecord })

        await github.pushTreeCommit(
          body.repoOwner,
          body.repoName,
          treeFiles,
          'docs: add BMAD delivery documentation',
        )
      } catch (pushErr) {
        console.error('[delivery/generate-docs] Push to repo failed:', pushErr)
      }
    }

    return NextResponse.json({
      success: true,
      documentPaths: docFiles.map((f) => f.path),
      deliverables: {
        architectureDecisionRecord: 'docs/architecture_decision_record.md',
        apiContracts: 'docs/api_contracts.json',
        dataBoundaryDocumentation: 'docs/data_boundary_documentation.md',
        operationalRunbook: 'docs/operational_runbook.md',
        hostingContract: 'docs/hosting_contract.json',
      },
    })
  } catch (err) {
    console.error('[delivery/generate-docs]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Doc generation failed', success: false },
      { status: 500 },
    )
  }
}
