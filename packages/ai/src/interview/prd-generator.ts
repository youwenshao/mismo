import { generateObject, generateText } from "ai";
import { getActiveModel } from "../providers";
import { PRD, prdSchema, ArchTemplateValues } from "./schemas";
import { ProjectArchetypes } from "./archetypes";
import { ArchTemplate } from "@mismo/shared";
import { z } from "zod";

export async function runClassifierAgent(transcript: string) {
  const model = getActiveModel();
  
  const { object } = await generateObject({
    model,
    schema: z.object({
      archetype: z.enum(ProjectArchetypes).describe("The classified archetype of the project"),
      reasoning: z.string().describe("Brief explanation for this classification"),
    }),
    prompt: `Analyze the following interview transcript and determine the best matching project archetype.
    
    TRANSCRIPT:
    ${transcript}
    `,
  });

  return object;
}

export async function runSecurityAgent(transcript: string) {
  const model = getActiveModel();
  
  const { object } = await generateObject({
    model,
    schema: z.object({
      securityRequirements: z.enum(["HIPAA", "GDPR", "SOC2", "Standard", "None"]).describe("Compliance and security needs"),
      reasoning: z.string().describe("Brief explanation for these requirements based on the transcript"),
    }),
    prompt: `Analyze the following interview transcript and determine the security and compliance requirements.
    Look for mentions of healthcare data, European users, enterprise requirements, or PII.
    
    TRANSCRIPT:
    ${transcript}
    `,
  });

  return object;
}

export async function runScopeAgent(transcript: string) {
  const model = getActiveModel();
  
  const { object } = await generateObject({
    model,
    schema: z.object({
      mvp: z.array(z.string()).describe("Features to be included in the MVP phase"),
      v2: z.array(z.string()).describe("Features deferred to V2 or later"),
    }),
    prompt: `Analyze the following interview transcript and break down the features into an MVP phase and a V2 phase.
    The MVP should focus on core, essential features required for a V1 launch.
    
    TRANSCRIPT:
    ${transcript}
    `,
  });

  return object;
}

/**
 * Determines the architecture template based on the transcript content.
 * Uses the same logic as pricing.ts for consistency.
 */
function determineArchTemplate(transcript: string): ArchTemplate {
  const lower = transcript.toLowerCase();
  
  // Check for microservices indicators
  if (lower.includes('microservice') || 
      lower.includes('scale') || 
      lower.includes('enterprise') ||
      lower.includes('high availability') ||
      lower.includes('distributed')) {
    return ArchTemplate.MICROSERVICES_SCALE;
  }
  
  // Check for monolith/MVP indicators
  if (lower.includes('speed') || 
      lower.includes('fast') || 
      lower.includes('simple') || 
      lower.includes('monolith') ||
      lower.includes('mvp') ||
      lower.includes('quick')) {
    return ArchTemplate.MONOLITHIC_MVP;
  }
  
  // Default to serverless SaaS
  return ArchTemplate.SERVERLESS_SAAS;
}

export async function runOutputCoordinator(transcript: string): Promise<PRD> {
  const model = getActiveModel();
  
  // Run sub-agents in parallel
  const [classifierData, securityData, scopeData] = await Promise.all([
    runClassifierAgent(transcript),
    runSecurityAgent(transcript),
    runScopeAgent(transcript),
  ]);

  const { object } = await generateObject({
    model,
    schema: prdSchema.omit({ archTemplate: true }),
    prompt: `You are the Lead Technical Architect writing a Product Requirements Document (PRD).
    Based on the interview transcript and the specialized agent analyses provided, generate a comprehensive PRD.
    
    TRANSCRIPT:
    ${transcript}
    
    AGENT ANALYSES:
    - Archetype: ${classifierData.archetype} (${classifierData.reasoning})
    - Security: ${securityData.securityRequirements} (${securityData.reasoning})
    - Scope (MVP): ${JSON.stringify(scopeData.mvp)}
    - Scope (V2): ${JSON.stringify(scopeData.v2)}
    `,
  });

  // Determine archTemplate from transcript for consistency with pricing
  const archTemplate = determineArchTemplate(transcript);

  return {
    ...object,
    archetype: classifierData.archetype,
    securityRequirements: securityData.securityRequirements,
    phases: {
      mvp: scopeData.mvp,
      v2: scopeData.v2,
    },
    archTemplate,
  };
}
