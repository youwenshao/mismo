import { PRD } from "./schemas";

export interface FeasibilityResult {
  isFeasible: boolean;
  estimatedTokens: number;
  warnings: string[];
  queueDepth: number;
  estimatedEtaDays: number;
}

// Very rough estimation: 1 token ≈ 4 characters of English text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function getMockQueueDepth(): Promise<number> {
  // In a real implementation, this would hit an n8n webhook or database
  return Math.floor(Math.random() * 5); // 0-4 projects in queue
}

export async function runFeasibilityCheck(transcript: string, prd: PRD): Promise<FeasibilityResult> {
  const estimatedTokens = estimateTokens(transcript);
  const warnings: string[] = [];
  let isFeasible = true;

  // 128k context check (Kimi context window)
  if (estimatedTokens > 100000) {
    warnings.push("Transcript approaches 128k token context limit.");
  }

  // Archetype specific checks
  if (prd.archetype === "Mobile App (iOS/Android)") {
    const hasAppleDev = transcript.toLowerCase().includes("apple developer");
    if (!hasAppleDev) {
      warnings.push("Missing Apple Developer account context for Mobile App.");
      // We might not fail it, but we warn heavily
    }
  }

  if (prd.archetype === "Existing System Modification / Maintenance") {
    const hasAdminAccess = transcript.toLowerCase().includes("admin") || transcript.toLowerCase().includes("access");
    if (!hasAdminAccess) {
      warnings.push("No explicit mention of admin/source access for existing system.");
      isFeasible = false;
    }
  }

  const queueDepth = await getMockQueueDepth();
  const baseEtaDays = 7;
  const estimatedEtaDays = baseEtaDays + (queueDepth * 2); // Add 2 days per project in queue

  return {
    isFeasible,
    estimatedTokens,
    warnings,
    queueDepth,
    estimatedEtaDays
  };
}
