import { prisma } from "@mismo/db";
import type { ProjectStatus } from "@mismo/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import PRDEditor from "./prd/prd-editor";
import type { PRDData } from "./prd/demo-data";

const STATUS_ORDER: ProjectStatus[] = [
  "DISCOVERY",
  "REVIEW",
  "CONTRACTED",
  "DEVELOPMENT",
  "VERIFICATION",
  "DELIVERED",
];

const PIPELINE_STAGES: { label: string; activeAt: ProjectStatus }[] = [
  { label: "Submitted",      activeAt: "REVIEW" },
  { label: "Under Review",   activeAt: "REVIEW" },
  { label: "Approved",       activeAt: "CONTRACTED" },
  { label: "In Development", activeAt: "DEVELOPMENT" },
  { label: "Final Checks",   activeAt: "VERIFICATION" },
  { label: "Delivered",      activeAt: "DELIVERED" },
];

function statusRank(status: ProjectStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? -1 : idx;
}

function ReviewPipeline({ status }: { status: ProjectStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 py-4 px-1 text-sm text-red-500">
        <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
        Project cancelled
      </div>
    );
  }

  const currentRank = statusRank(status);

  return (
    <div className="flex items-center gap-0 py-4 overflow-x-auto">
      {PIPELINE_STAGES.map((stage, i) => {
        const stageRank = statusRank(stage.activeAt);
        const isComplete = currentRank > stageRank;
        const isActive = currentRank === stageRank;

        let dotClass: string;
        let textClass: string;
        if (isActive) {
          dotClass = "bg-amber-400 animate-pulse";
          textClass = "text-gray-900 font-medium";
        } else {
          dotClass = "bg-gray-200";
          textClass = "text-gray-400";
        }

        return (
          <div key={stage.label} className="flex items-center">
            {i > 0 && (
              <div className="w-8 h-px mx-1 bg-gray-200" />
            )}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
              <span className={`text-xs ${textClass}`}>{stage.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
      <header className="flex items-center justify-between px-6 py-4 shrink-0 bg-white/80 backdrop-blur-md z-50"
        style={{
          maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
        }}
      >
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
          <ReviewPipeline status={project.status} />
          <PRDEditor prd={mappedPrd} />
        </div>
      </main>
    </div>
  );
}
