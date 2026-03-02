import { describe, it, expect } from 'vitest';
import { runOutputCoordinator } from '../prd-generator';
import { getActiveModel } from '../../providers';

// Mock getActiveModel so we don't actually hit the LLM in unit tests by default,
// or we can test with actual models if we want an integration test.
// For these tests, we'll assume we are testing the schema and parsing logic,
// and we'll let the AI SDK handle its generation.
// In a real environment, we'd mock the AI SDK's generateObject or use a test provider.

// For now, we will just provide the test skeletons.
describe('PRD Generator', () => {
  const MOCK_TRANSCRIPTS = {
    marketingSite: `
      User: I want a landing page for my new coffee shop.
      Mo: Great! What features do you need?
      User: Just a menu, location, and a contact form. Nothing fancy. It should be fast.
      Mo: Any plans for the future?
      User: Maybe online ordering later, but not now.
    `,
    saasApp: `
      User: I'm building a project management tool for designers.
      Mo: What does it do?
      User: They can create boards, upload images, and comment. We need Stripe for subscriptions.
      Mo: Any compliance needs?
      User: No, just standard web security.
    `,
    iosApp: `
      User: I want to build a fitness tracker for iOS.
      Mo: What features?
      User: Step counting, Apple Health integration, and a social feed.
      Mo: Do you have an Apple Developer account?
      User: Yes, I just registered one.
    `,
    n8nAutomation: `
      User: I need to automate my lead generation.
      Mo: How does it work?
      User: When a lead comes in via Typeform, I want to enrich it with Clearbit and push to HubSpot.
      Mo: Where is this hosted?
      User: I want to use n8n.
    `,
    legacyApi: `
      User: We have an old SOAP API we need to wrap in a modern REST API.
      Mo: What's the scale?
      User: About 10,000 requests per day.
      Mo: Do you have access to the old system?
      User: Yes, we have admin access and documentation.
    `
  };

  it('should have test cases defined', () => {
    expect(Object.keys(MOCK_TRANSCRIPTS).length).toBe(5);
  });

  // We are skipping the actual LLM calls in this unit test file to avoid flakiness and cost,
  // but this is where we would assert that runOutputCoordinator returns a valid PRD matching our schema.
  it.skip('should generate a valid PRD for a marketing site', async () => {
    const prd = await runOutputCoordinator(MOCK_TRANSCRIPTS.marketingSite);
    expect(prd.archetype).toBe('Marketing/Landing Site');
    expect(prd.phases.mvp.length).toBeGreaterThan(0);
  });
});
