import { prisma } from "@mismo/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import PRDEditor from "./prd/prd-editor";
import type { PRDData } from "./prd/demo-data";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { prd: true },
  });

  if (!project || !project.prd) {
    notFound();
  }

  const content = project.prd.content as any;
  const userStories = project.prd.userStories as any;
  const apiSpec = project.prd.apiSpec as any;

  const mappedPrd: PRDData = {
    projectName: project.name,
    version: "1.0",
    lastUpdated: project.prd.updatedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    ambiguityScore: project.prd.ambiguityScore,
    overview: {
      description: content?.overview || "TBD",
      problemStatement: content?.problemStatement || "TBD",
    },
    targetUsers: {
      personas: Array.isArray(content?.targetUsers) 
        ? content.targetUsers 
        : [
            {
              name: "Primary Audience",
              description: content?.targetUsers || "TBD",
            },
          ],
    },
    features: content?.features || [],
    userStories: Array.isArray(userStories) ? userStories : [],
    dataModel: project.prd.dataModel || "TBD",
    apiSpec: apiSpec || null,
    architecture: {
      template: project.prd.archTemplate,
      description: content?.overview || "TBD", // Using overview as a fallback description for architecture
    },
    sections: [
      { id: "overview", title: "Overview", type: "overview" },
      { id: "target-users", title: "Target Users", type: "target-users" },
      { id: "features", title: "Features", type: "features" },
      { id: "user-stories", title: "User Stories", type: "user-stories" },
      { id: "data-model", title: "Data Model", type: "data-model" },
      { id: "api", title: "API Specification", type: "api" },
      { id: "architecture", title: "Architecture", type: "architecture" },
    ],
    comments: {},
  };

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-gray-100">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          Mismo
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          back to dashboard
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <PRDEditor prd={mappedPrd} />
        </div>
      </main>
    </div>
  );
}
