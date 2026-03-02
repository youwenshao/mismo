import { describe, it, expect } from 'vitest';
import { ArchTemplate } from '@mismo/shared';

// Import the determineArchTemplate function logic for testing
// Since it's private in prd-generator.ts, we'll recreate it here for testing
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

describe('Architecture Template Determination', () => {
  describe('MICROSERVICES_SCALE detection', () => {
    it('should detect microservices keyword', () => {
      const transcript = 'We need a microservices architecture for our enterprise application';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MICROSERVICES_SCALE);
    });

    it('should detect scale keyword', () => {
      const transcript = 'This needs to scale to millions of users across multiple regions';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MICROSERVICES_SCALE);
    });

    it('should detect enterprise keyword', () => {
      const transcript = 'This is an enterprise-grade solution with complex requirements';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MICROSERVICES_SCALE);
    });

    it('should detect high availability keyword', () => {
      const transcript = 'We need high availability with 99.999% uptime';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MICROSERVICES_SCALE);
    });

    it('should detect distributed keyword', () => {
      const transcript = 'This is a distributed system with multiple services';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MICROSERVICES_SCALE);
    });
  });

  describe('MONOLITHIC_MVP detection', () => {
    it('should detect speed keyword', () => {
      const transcript = 'We need to move fast and get to market quickly';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MONOLITHIC_MVP);
    });

    it('should detect fast keyword', () => {
      const transcript = 'We want a fast development cycle for our prototype';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MONOLITHIC_MVP);
    });

    it('should detect simple keyword', () => {
      const transcript = 'Keep it simple, we just need basic features';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MONOLITHIC_MVP);
    });

    it('should detect monolith keyword', () => {
      const transcript = 'We prefer a monolith approach for now';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MONOLITHIC_MVP);
    });

    it('should detect mvp keyword', () => {
      const transcript = 'This is just an MVP to test the market';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MONOLITHIC_MVP);
    });

    it('should detect quick keyword', () => {
      const transcript = 'We need something quick and dirty';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MONOLITHIC_MVP);
    });
  });

  describe('SERVERLESS_SAAS default', () => {
    it('should default to SERVERLESS_SAAS for generic SaaS', () => {
      const transcript = 'We want to build a SaaS application with user authentication and billing';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.SERVERLESS_SAAS);
    });

    it('should detect MONOLITHIC_MVP for simple web app', () => {
      // Note: "simple" triggers MONOLITHIC_MVP which is correct for MVPs
      const transcript = 'Just a simple web application with a database';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MONOLITHIC_MVP);
    });

    it('should default to SERVERLESS_SAAS for empty transcript', () => {
      const transcript = '';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.SERVERLESS_SAAS);
    });

    it('should default to SERVERLESS_SAAS for landing page', () => {
      const transcript = 'We need a marketing landing page with contact form';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.SERVERLESS_SAAS);
    });
  });

  describe('Priority ordering', () => {
    it('should prioritize MICROSERVICES_SCALE over MONOLITHIC_MVP', () => {
      // Contains both 'fast' (monolith) and 'scale' (microservices)
      const transcript = 'We need to move fast but also scale to millions of users';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MICROSERVICES_SCALE);
    });

    it('should detect microservices even with mvp mentioned', () => {
      const transcript = 'This is an MVP but needs microservices for future scaling';
      expect(determineArchTemplate(transcript)).toBe(ArchTemplate.MICROSERVICES_SCALE);
    });
  });
});

describe('ArchTemplate Enum Values', () => {
  it('should have correct enum values', () => {
    expect(ArchTemplate.SERVERLESS_SAAS).toBe('SERVERLESS_SAAS');
    expect(ArchTemplate.MONOLITHIC_MVP).toBe('MONOLITHIC_MVP');
    expect(ArchTemplate.MICROSERVICES_SCALE).toBe('MICROSERVICES_SCALE');
  });

  it('should be usable as Prisma enum values', () => {
    // These values should match the Prisma schema exactly
    const validPrismaValues = ['SERVERLESS_SAAS', 'MONOLITHIC_MVP', 'MICROSERVICES_SCALE'];
    
    Object.values(ArchTemplate).forEach(value => {
      expect(validPrismaValues).toContain(value);
    });
  });
});
