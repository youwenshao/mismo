import { z } from 'zod'

export const DesignDnaSchema = z.object({
  mood: z.enum(['brutalist', 'corporate', 'playful', 'cyberpunk', 'minimal']),
  typography: z.object({
    heading: z.string(),
    body: z.string(),
    scale: z.array(z.number()),
  }),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    backgrounds: z.array(z.string()),
    forbidden: z.array(z.string()),
  }),
  motion: z.object({
    page_load: z.enum(['fade-up', 'stagger', 'none']),
    scroll: z.enum(['parallax', 'reveal', 'none']),
    max_complexity: z.enum(['micro-interactions', 'full-webgl']),
  }),
  content_rules: z.object({
    forbidden_phrases: z.array(z.string()),
    cta_required: z.boolean(),
    lorem_ipsum_detection: z.enum(['strict_rejection', 'warn', 'allow']),
  }),
})

export type DesignDna = z.infer<typeof DesignDnaSchema>
