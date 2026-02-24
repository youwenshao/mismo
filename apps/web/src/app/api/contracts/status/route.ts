import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  // Mock response — in production this would query the database / e-signature provider
  return NextResponse.json({
    projectId,
    status: "PENDING" as "PENDING" | "SENT" | "SIGNED",
    acknowledgments: {
      ip: false,
      age: false,
      aup: false,
    },
  });
}
