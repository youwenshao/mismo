export interface DocGenerationInput {
  projectName: string
  prdJson: Record<string, unknown>
  buildOutput: {
    dbSchema?: string
    backendRoutes?: string[]
    frontendScreens?: string[]
    techStack?: string[]
  }
}

export interface GeneratedDocs {
  adr: string
  howToGuide: string
  apiDocs: string | null
}

export async function generateDocumentation(input: DocGenerationInput): Promise<GeneratedDocs> {
  const { projectName, prdJson, buildOutput } = input

  const adr = generateADR(projectName, prdJson, buildOutput)
  const howToGuide = generateHowToGuide(projectName, buildOutput)
  const apiDocs = buildOutput.backendRoutes?.length
    ? generateAPIDocs(projectName, buildOutput.backendRoutes)
    : null

  return { adr, howToGuide, apiDocs }
}

function generateADR(
  projectName: string,
  prd: Record<string, unknown>,
  build: DocGenerationInput['buildOutput'],
): string {
  const techStack = build.techStack ?? ['Next.js', 'TypeScript', 'Prisma', 'Supabase']
  const screenCount = build.frontendScreens?.length ?? 0
  const routeCount = build.backendRoutes?.length ?? 0

  return `# Architecture Decision Record: ${projectName}

## Status
Accepted

## Context
${(prd.description as string) ?? `${projectName} was built to fulfill the requirements defined in the product specification.`}

## Decision

### Tech Stack
${techStack.map((t) => `- ${t}`).join('\n')}

### Database
${build.dbSchema ? `The database schema includes the data models required by the PRD. Schema details are in the repository's \`prisma/schema.prisma\` file.` : 'Database configuration is included in the project.'}

### Frontend
${screenCount > 0 ? `${screenCount} screens were implemented:` : 'Frontend screens were implemented as specified.'}
${build.frontendScreens?.map((s) => `- ${s}`).join('\n') ?? ''}

### Backend API
${routeCount > 0 ? `${routeCount} API routes were created to handle the business logic.` : 'API routes were created as specified in the PRD.'}

## Consequences
- The project uses a modern stack optimized for developer experience and deployment simplicity.
- Supabase provides authentication, database, and realtime capabilities out of the box.
- Prisma provides type-safe database access with migration support.
- The project can be deployed to Vercel with zero configuration.

## How to Extend
- Add new pages in \`src/app/\` following the Next.js App Router conventions.
- Add new API routes in \`src/app/api/\`.
- Modify the database schema in \`prisma/schema.prisma\` and run \`npx prisma migrate dev\`.
`
}

function generateHowToGuide(
  projectName: string,
  build: DocGenerationInput['buildOutput'],
): string {
  return `# How to Modify: ${projectName}

This guide is written for non-technical readers who want to make common changes to the project.

## Getting Started

1. **Open the project**: Clone the repository and open it in your code editor (we recommend VS Code or Cursor).
2. **Install dependencies**: Run \`npm install\` (or \`pnpm install\`) in the terminal.
3. **Start development server**: Run \`npm run dev\` to see the site at http://localhost:3000.

## Common Changes

### Change text or copy
- Open the relevant page file in \`src/app/\`
- Find the text you want to change (use Ctrl+F / Cmd+F to search)
- Edit the text between the quote marks
- Save the file — the browser will update automatically

### Change colors or styling
- Look for \`className\` attributes in the page files
- Colors use Tailwind CSS classes like \`bg-blue-500\`, \`text-gray-900\`
- Replace the color name and number to change colors (e.g., \`blue-500\` to \`green-600\`)

### Add a new page
1. Create a new folder in \`src/app/\` with the URL path you want (e.g., \`src/app/about/\`)
2. Create a \`page.tsx\` file inside that folder
3. The page will be available at the corresponding URL (e.g., \`/about\`)

### Change environment variables
- Copy \`.env.example\` to \`.env.local\`
- Update the values for your API keys and configuration
- Restart the development server after changing environment variables

## Deploying Changes

1. Commit your changes: \`git add . && git commit -m "description of change"\`
2. Push to GitHub: \`git push\`
3. If connected to Vercel, the deployment happens automatically.

## Need Help?

Contact us and we'll help you make the changes you need.
`
}

function generateAPIDocs(projectName: string, routes: string[]): string {
  return `# API Documentation: ${projectName}

## Base URL
\`\`\`
https://your-app.vercel.app/api
\`\`\`

## Endpoints

${routes.map((route) => {
  const method = route.includes('GET') ? 'GET' : route.includes('DELETE') ? 'DELETE' : 'POST'
  const path = route.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/, '')
  return `### \`${method} ${path}\`

**Description**: Handles ${path.split('/').pop()} operations.

**Authentication**: Required (Bearer token)

---`
}).join('\n\n')}

## Authentication

All API endpoints require authentication via Supabase. Include the session token in the Authorization header:

\`\`\`
Authorization: Bearer <your-session-token>
\`\`\`

## Error Responses

All endpoints return errors in this format:

\`\`\`json
{
  "error": "Description of what went wrong"
}
\`\`\`
`
}
