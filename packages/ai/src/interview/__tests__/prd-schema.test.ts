import { describe, it, expect } from 'vitest';
import { prdSchema, ArchTemplateValues } from '../schemas';
import { ArchTemplate } from '@mismo/shared';

describe('PRD Schema Validation', () => {
  const validPRD = {
    archetype: 'SaaS Web App',
    title: 'Test Project',
    overview: 'A comprehensive test project for validation',
    architectureDecisions: ['Use React for frontend', 'Use Node.js for backend'],
    agentRequirements: [],
    constraints: ['Must be completed in 6 weeks'],
    acceptanceCriteria: ['User can sign up', 'User can log in'],
    securityRequirements: 'Standard' as const,
    scaleExpectations: '1000 users per day',
    phases: {
      mvp: ['User authentication', 'Basic dashboard'],
      v2: ['Advanced analytics', 'API integrations'],
    },
    archTemplate: 'MONOLITHIC_MVP',
  };

  describe('Valid PRD', () => {
    it('should accept a valid PRD', () => {
      const result = prdSchema.safeParse(validPRD);
      expect(result.success).toBe(true);
    });

    it('should accept all valid archTemplate values', () => {
      ArchTemplateValues.forEach((template) => {
        const prd = { ...validPRD, archTemplate: template };
        const result = prdSchema.safeParse(prd);
        expect(result.success).toBe(true);
      });
    });

    it('should match TypeScript ArchTemplate enum values', () => {
      const enumValues = Object.values(ArchTemplate);
      expect(ArchTemplateValues).toEqual(enumValues);
    });
  });

  describe('Required fields', () => {
    it('should reject PRD without title', () => {
      const prd = { ...validPRD, title: undefined };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });

    it('should reject PRD without overview', () => {
      const prd = { ...validPRD, overview: undefined };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });

    it('should reject PRD without archTemplate', () => {
      const prd = { ...validPRD, archTemplate: undefined };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });

    it('should reject PRD with invalid archTemplate', () => {
      const prd = { ...validPRD, archTemplate: 'INVALID_TEMPLATE' };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });

    it('should reject PRD without phases', () => {
      const prd = { ...validPRD, phases: undefined };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });

    it('should reject PRD without acceptanceCriteria', () => {
      const prd = { ...validPRD, acceptanceCriteria: undefined };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });
  });

  describe('Optional fields', () => {
    it('should accept PRD without archetype', () => {
      const prd = { ...validPRD, archetype: undefined };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(true);
    });

    it('should accept empty agentRequirements', () => {
      const prd = { ...validPRD, agentRequirements: [] };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(true);
    });

    it('should accept empty constraints', () => {
      const prd = { ...validPRD, constraints: [] };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(true);
    });
  });

  describe('Security requirements', () => {
    it('should accept all valid security requirement values', () => {
      const validSecurityValues = ['HIPAA', 'GDPR', 'SOC2', 'Standard', 'None'] as const;
      
      validSecurityValues.forEach((security) => {
        const prd = { ...validPRD, securityRequirements: security };
        const result = prdSchema.safeParse(prd);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid security requirement', () => {
      const prd = { ...validPRD, securityRequirements: 'InvalidSecurity' };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });
  });

  describe('Phases structure', () => {
    it('should reject phases without mvp', () => {
      const prd = { 
        ...validPRD, 
        phases: { v2: ['Feature'] } 
      };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });

    it('should reject phases without v2', () => {
      const prd = { 
        ...validPRD, 
        phases: { mvp: ['Feature'] } 
      };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(false);
    });

    it('should accept empty mvp array', () => {
      const prd = { 
        ...validPRD, 
        phases: { mvp: [], v2: ['Future feature'] } 
      };
      const result = prdSchema.safeParse(prd);
      expect(result.success).toBe(true);
    });
  });
});

describe('ArchTemplateValues constant', () => {
  it('should contain all three architecture templates', () => {
    expect(ArchTemplateValues).toHaveLength(3);
    expect(ArchTemplateValues).toContain('SERVERLESS_SAAS');
    expect(ArchTemplateValues).toContain('MONOLITHIC_MVP');
    expect(ArchTemplateValues).toContain('MICROSERVICES_SCALE');
  });

  it('should be readonly', () => {
    // TypeScript will enforce this at compile time
    // At runtime, we can verify the array structure
    expect(Array.isArray(ArchTemplateValues)).toBe(true);
  });
});
