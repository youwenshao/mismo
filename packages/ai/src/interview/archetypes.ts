export const ProjectArchetypes = [
  "Marketing/Landing Site",
  "SaaS Web App",
  "Internal Tool / Admin Panel",
  "Agentic AI Pipeline / Automation",
  "Mobile App (iOS/Android)",
  "API / Backend Service",
  "E-commerce Platform",
  "Data Pipeline / ETL",
  "Existing System Modification / Maintenance",
] as const;

export type ProjectArchetype = typeof ProjectArchetypes[number];
