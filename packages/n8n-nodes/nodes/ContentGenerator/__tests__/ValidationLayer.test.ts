import { ValidationLayer } from '../ValidationLayer';

describe('ValidationLayer', () => {
    it('fails on forbidden marketing fluff', () => {
        const result = ValidationLayer.validate('This is the best and most advanced product.', 'B2B');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Forbidden phrase detected: 'best'");
        expect(result.errors).toContain("Forbidden phrase detected: 'most advanced'");
    });

    it('calculates Flesch-Kincaid correctly for B2C (target: <= 8)', () => {
        // Very complex sentence
        const result = ValidationLayer.validate('The ubiquitous methodology implemented facilitates paradoxical paradigm shifts.', 'B2C');
        expect(result.isValid).toBe(false);
        // Should contain Flesch-Kincaid score error
        expect(result.errors.some(e => e.match(/Flesch-Kincaid score/))).toBe(true);
    });

    it('passes on clean, readable text', () => {
        const result = ValidationLayer.validate('We help you cut deployment time by forty percent in two weeks. You can automate tasks which means saving time.', 'B2B');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('flags Hemingway-style passive voice', () => {
        const result = ValidationLayer.validate('The product is built by our team.', 'B2B');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Passive voice detected: 'is built'");
    });

    it('flags Hemingway-style adverbs', () => {
        const result = ValidationLayer.validate('We quickly deploy your changes.', 'B2B');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Adverb detected: 'quickly'");
    });
});
