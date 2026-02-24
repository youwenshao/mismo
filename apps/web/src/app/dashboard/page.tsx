import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@mismo/db";
import { timeAgo } from "@/lib/format";
import type { ProjectStatus } from "@mismo/db";

const statusLabels: Record<ProjectStatus, string> = {
  DISCOVERY: "Talking to Mo",
  REVIEW: "Reviewing your spec",
  CONTRACTED: "Getting started",
  DEVELOPMENT: "Being built",
  VERIFICATION: "Final checks",
  DELIVERED: "Ready for you",
  CANCELLED: "Cancelled",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth");

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h1 className="text-2xl font-semibold">Welcome to Mismo</h1>
        <p className="mt-2 text-gray-500">
          Let&apos;s start by telling Mo about your idea
        </p>
        <Link
          href="/chat"
          className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Talk to Mo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your projects</h1>
        <Link
          href="/chat"
          className="text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          Start a new project
        </Link>
      </div>

      <div>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/project/${project.id}`}
            className="block border-b border-gray-100 px-2 py-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{project.name}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {statusLabels[project.status]}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                Updated {timeAgo(project.updatedAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
