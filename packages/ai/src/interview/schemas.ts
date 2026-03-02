import { z } from "zod";
import { ProjectArchetypes } from "./archetypes";

export const prdSchema = z.object({
  archetype: z.enum(ProjectArchetypes).optional().describe("The classified archetype of the project"),
  title: z.string().describe("The name or title of the project"),
  overview: z.string().describe("A high-level summary of the project goals"),
  architectureDecisions: z.array(z.string()).describe("Key architecture decisions and tech stack recommendations"),
  agentRequirements: z.array(z.string()).describe("Any AI or agentic requirements, if applicable"),
  constraints: z.array(z.string()).describe("Technical, business, or timeline constraints"),
  acceptanceCriteria: z.array(z.string()).describe("Core acceptance criteria for the MVP"),
  securityRequirements: z.enum(["HIPAA", "GDPR", "SOC2", "Standard", "None"]).describe("Compliance and security needs"),
  scaleExpectations: z.string().describe("Expected scale, e.g., users/day, requests/second"),
  phases: z.object({
    mvp: z.array(z.string()).describe("Features to be included in the MVP phase"),
    v2: z.array(z.string()).describe("Features deferred to V2 or later"),
  }).describe("Phased breakdown of the project"),
});

export type PRD = z.infer<typeof prdSchema>;
