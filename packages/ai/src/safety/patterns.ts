export interface ProhibitedPattern {
  category: string
  patterns: RegExp[]
  severity: 'YELLOW' | 'RED'
}

export const PROHIBITED_PATTERNS: ProhibitedPattern[] = [
  {
    category: 'Healthcare (HIPAA)',
    patterns: [
      /\bhipaa\b/i,
      /\bprotected health information\b/i,
      /\bphi\b/i,
      /\belectronic health record/i,
      /\behr\b/i,
      /\bmedical records?\b/i,
      /\bpatient data\b/i,
      /\bdiagnos(?:is|tic)\b/i,
      /\bprescription management\b/i,
    ],
    severity: 'RED',
  },
  {
    category: 'Unlicensed Financial Services',
    patterns: [
      /\bmoney transmit/i,
      /\bcryptocurrency exchange\b/i,
      /\blending platform\b/i,
      /\binvestment advisor/i,
      /\bsecurities trading\b/i,
      /\bbank(?:ing)? license/i,
    ],
    severity: 'RED',
  },
  {
    category: 'Gambling',
    patterns: [
      /\bonline gambling\b/i,
      /\bsports betting\b/i,
      /\bcasino\b/i,
      /\bwager(?:ing)?\b/i,
      /\bpoker platform\b/i,
      /\bslot machine/i,
    ],
    severity: 'RED',
  },
  {
    category: 'Adult Content',
    patterns: [/\badult content\b/i, /\bpornograph/i, /\bexplicit content\b/i],
    severity: 'RED',
  },
  {
    category: 'Weapons / Controlled Substances',
    patterns: [
      /\bweapon(?:s)? (?:sale|marketplace)\b/i,
      /\bfirearm(?:s)? (?:sale|marketplace)\b/i,
      /\bdrug marketplace\b/i,
    ],
    severity: 'RED',
  },
  {
    category: 'Data Sensitivity (Moderate)',
    patterns: [
      /\bchildren(?:'s)? data\b/i,
      /\bcoppa\b/i,
      /\bunder 13\b/i,
      /\bbiometric data\b/i,
      /\bfacial recognition\b/i,
    ],
    severity: 'YELLOW',
  },
]
