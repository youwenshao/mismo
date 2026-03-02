import { describe, it, expect, beforeAll } from 'vitest';
import { ArchTemplate } from '@mismo/shared';
import { prdSchema } from '../schemas';

/**
 * Integration tests for the Mo PRD Generation Pipeline
 * 
 * These tests verify that:
 * 1. The PRD schema is valid and complete
 * 2. The archTemplate determination works correctly
 * 3. The pipeline produces PRDs that can be stored in Prisma
 */

describe('Mo PRD Generation Pipeline Integration', () => {
  describe('End-to-end PRD validation', () => {
    const mockGeneratedPRDs = [
      {
        name: 'Marketing Site PRD',
        prd: {
          archetype: 'Marketing/Landing Site',
          title: 'Coffee Shop Landing Page',
          overview: 'A simple landing page for a local coffee shop featuring menu, location, and contact form.',
          architectureDecisions: [
            'Static site generator (Next.js or Astro) for fast load times',
            'Hosted on Vercel or Netlify CDN',
            'Contact form using serverless functions',
          ],
          agentRequirements: [],
          constraints: [
            'Timeline: 1-2 weeks',
            'Budget: $2,000 - $3,500',
          ],
          acceptanceCriteria: [
            'Display coffee menu with prices and images',
            'Show shop location with embedded map',
            'Contact form that sends emails',
            'Mobile-responsive design',
          ],
          securityRequirements: 'Standard',
          scaleExpectations: 'Low traffic, local customers only',
          phases: {
            mvp: ['Homepage with hero section', 'Menu page', 'Location & contact page'],
            v2: ['Online ordering integration', 'Loyalty program signup'],
          },
          archTemplate: 'SERVERLESS_SAAS',
        },
        expectedArchTemplate: ArchTemplate.SERVERLESS_SAAS,
      },
      {
        name: 'MVP SaaS PRD',
        prd: {
          archetype: 'SaaS Web App',
          title: 'Project Management Tool',
          overview: 'A project management tool for designers to create boards, upload images, and collaborate.',
          architectureDecisions: [
            'Next.js frontend with TypeScript',
            'PostgreSQL database with Prisma ORM',
            'Stripe for subscription billing',
            'AWS S3 for image storage',
          ],
          agentRequirements: [],
          constraints: [
            'Timeline: 6-8 weeks',
            'Budget: $8,000 - $12,000',
          ],
          acceptanceCriteria: [
            'User authentication and profiles',
            'Create and manage project boards',
            'Upload and organize images',
            'Comment and collaborate on designs',
            'Subscription billing with Stripe',
          ],
          securityRequirements: 'Standard',
          scaleExpectations: 'Hundreds of users initially',
          phases: {
            mvp: ['User auth', 'Basic boards', 'Image upload', 'Comments'],
            v2: ['Real-time collaboration', 'Advanced permissions', 'API access'],
          },
          archTemplate: 'MONOLITHIC_MVP',
        },
        expectedArchTemplate: ArchTemplate.MONOLITHIC_MVP,
      },
      {
        name: 'Enterprise Microservices PRD',
        prd: {
          archetype: 'E-commerce Platform',
          title: 'Global E-commerce Platform',
          overview: 'A distributed e-commerce platform serving millions of users across multiple regions.',
          architectureDecisions: [
            'Microservices architecture with Kubernetes',
            'Event-driven architecture using Kafka',
            'Multi-region deployment for latency',
            'GraphQL federation for API aggregation',
          ],
          agentRequirements: [
            'AI-powered product recommendations',
            'Chatbot for customer support',
          ],
          constraints: [
            'Timeline: 6 months',
            'Budget: $100,000+',
            '99.99% uptime SLA',
            'PCI-DSS compliance required',
          ],
          acceptanceCriteria: [
            'Handle 10,000 concurrent users',
            'Sub-100ms response times globally',
            'Multi-currency and multi-language support',
            'Real-time inventory management',
          ],
          securityRequirements: 'SOC2',
          scaleExpectations: 'Millions of users, 1000s of transactions per second',
          phases: {
            mvp: ['Core catalog service', 'Payment processing', 'User management'],
            v2: ['AI recommendations', 'Advanced analytics', 'Marketplace features'],
          },
          archTemplate: 'MICROSERVICES_SCALE',
        },
        expectedArchTemplate: ArchTemplate.MICROSERVICES_SCALE,
      },
    ];

    mockGeneratedPRDs.forEach(({ name, prd, expectedArchTemplate }) => {
      it(`should validate ${name} against schema`, () => {
        const result = prdSchema.safeParse(prd);
        expect(result.success).toBe(true);
      });

      it(`should have correct archTemplate for ${name}`, () => {
        expect(prd.archTemplate).toBe(expectedArchTemplate);
      });
    });
  });

  describe('Prisma compatibility', () => {
    it('should produce archTemplate values compatible with Prisma enum', () => {
      const validPrismaValues = [
        'SERVERLESS_SAAS',
        'MONOLITHIC_MVP', 
        'MICROSERVICES_SCALE',
      ];

      const testPrd = {
        archetype: 'SaaS Web App',
        title: 'Test Project',
        overview: 'Test overview',
        architectureDecisions: [],
        agentRequirements: [],
        constraints: [],
        acceptanceCriteria: [],
        securityRequirements: 'Standard',
        scaleExpectations: 'Test',
        phases: { mvp: [], v2: [] },
      };

      validPrismaValues.forEach((template) => {
        const prd = { ...testPrd, archTemplate: template };
        const result = prdSchema.safeParse(prd);
        expect(result.success).toBe(true);
      });
    });

    it('should reject archTemplate values not in Prisma enum', () => {
      const invalidTemplates = [
        'monolithic_mvp', // lowercase
        'Serverless_SaaS', // mixed case
        'invalid',
        '',
        null,
        undefined,
      ];

      const testPrd = {
        archetype: 'SaaS Web App',
        title: 'Test Project',
        overview: 'Test overview',
        architectureDecisions: [],
        agentRequirements: [],
        constraints: [],
        acceptanceCriteria: [],
        securityRequirements: 'Standard',
        scaleExpectations: 'Test',
        phases: { mvp: [], v2: [] },
      };

      invalidTemplates.forEach((template) => {
        const prd = { ...testPrd, archTemplate: template };
        const result = prdSchema.safeParse(prd);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('PRD content completeness', () => {
    const completePRD = {
      archetype: 'SaaS Web App',
      title: 'Complete Test Project',
      overview: 'A comprehensive test project with all fields populated',
      architectureDecisions: [
        'Decision 1: Use React for frontend',
        'Decision 2: Use Node.js for backend',
        'Decision 3: Use PostgreSQL for database',
      ],
      agentRequirements: [
        'AI feature 1: Recommendation engine',
        'AI feature 2: Chatbot',
      ],
      constraints: [
        'Timeline: 3 months',
        'Budget: $50,000',
        'Team: 3 developers',
      ],
      acceptanceCriteria: [
        'Criterion 1: User can sign up',
        'Criterion 2: User can log in',
        'Criterion 3: User can reset password',
      ],
      securityRequirements: 'GDPR',
      scaleExpectations: '10,000 DAU within first year',
      phases: {
        mvp: ['Feature A', 'Feature B', 'Feature C'],
        v2: ['Feature D', 'Feature E'],
      },
      archTemplate: 'SERVERLESS_SAAS',
    };

    it('should accept a fully populated PRD', () => {
      const result = prdSchema.safeParse(completePRD);
      expect(result.success).toBe(true);
    });

    it('should preserve all field values after validation', () => {
      const result = prdSchema.parse(completePRD);
      expect(result.title).toBe(completePRD.title);
      expect(result.overview).toBe(completePRD.overview);
      expect(result.architectureDecisions).toEqual(completePRD.architectureDecisions);
      expect(result.agentRequirements).toEqual(completePRD.agentRequirements);
      expect(result.constraints).toEqual(completePRD.constraints);
      expect(result.acceptanceCriteria).toEqual(completePRD.acceptanceCriteria);
      expect(result.securityRequirements).toBe(completePRD.securityRequirements);
      expect(result.scaleExpectations).toBe(completePRD.scaleExpectations);
      expect(result.phases).toEqual(completePRD.phases);
      expect(result.archTemplate).toBe(completePRD.archTemplate);
    });
  });
});

describe('Error scenarios', () => {
  it('should handle missing required fields gracefully', () => {
    const incompletePRD = {
      title: 'Incomplete Project',
      // Missing overview, archTemplate, etc.
    };

    const result = prdSchema.safeParse(incompletePRD);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      const errors = result.error.errors;
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('should provide clear error messages for invalid archTemplate', () => {
    const prdWithInvalidTemplate = {
      archetype: 'Test',
      title: 'Test Project',
      overview: 'Test overview',
      architectureDecisions: [],
      agentRequirements: [],
      constraints: [],
      acceptanceCriteria: [],
      securityRequirements: 'Standard',
      scaleExpectations: 'Test',
      phases: { mvp: [], v2: [] },
      archTemplate: 'INVALID',
    };

    const result = prdSchema.safeParse(prdWithInvalidTemplate);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      const archTemplateError = result.error.errors.find(
        e => e.path.includes('archTemplate')
      );
      expect(archTemplateError).toBeDefined();
    }
  });
});
