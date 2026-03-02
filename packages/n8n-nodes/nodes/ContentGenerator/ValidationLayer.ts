export class ValidationLayer {
  private static FORBIDDEN_PHRASES = [
    'best',
    'most advanced',
    'revolutionary',
    'cutting-edge',
  ];

  // A simple list of "to be" verbs to detect potential passive voice
  private static TO_BE_VERBS = [
    'is', 'are', 'was', 'were', 'be', 'been', 'being'
  ];

  static validate(text: string, audience: 'B2B' | 'B2C'): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Forbidden phrases
    for (const phrase of this.FORBIDDEN_PHRASES) {
      const regex = new RegExp(`\\b${phrase}\\b`, 'i');
      if (regex.test(text)) {
        errors.push(`Forbidden phrase detected: '${phrase}'`);
      }
    }

    // 2. Flesch-Kincaid
    const fkScore = this.calculateFleschKincaid(text);
    const targetScore = audience === 'B2C' ? 8 : 12;
    if (fkScore > targetScore) {
      errors.push(`Flesch-Kincaid score: ${fkScore.toFixed(1)} (Target: <= ${targetScore})`);
    }

    // 3. Hemingway Adverbs
    const adverbMatches = text.match(/\b\w+ly\b/gi);
    if (adverbMatches) {
      for (const adverb of adverbMatches) {
        // Exception for words that end in 'ly' but aren't typically considered adverbs we want to flag, 
        // but for simplicity we flag all here as Hemingway does aggressively, or just flag first.
        if (adverb.toLowerCase() !== 'only' && adverb.toLowerCase() !== 'apply') {
          errors.push(`Adverb detected: '${adverb}'`);
        }
      }
    }

    // 4. Hemingway Passive Voice
    // Very simplified regex: [to be verb] + [word ending in ed/en/t]
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    for (let i = 0; i < words.length - 1; i++) {
      if (this.TO_BE_VERBS.includes(words[i])) {
        const nextWord = words[i + 1];
        if (nextWord.endsWith('ed') || nextWord.endsWith('en') || nextWord === 'built') {
          errors.push(`Passive voice detected: '${words[i]} ${nextWord}'`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static calculateFleschKincaid(text: string): number {
    const sentences = text.split(/[.?!]+/g).filter(s => s.trim().length > 0).length || 1;
    const wordsMatch = text.match(/\b\w+\b/g);
    const words = wordsMatch ? wordsMatch.length : 1;
    
    let syllables = 0;
    if (wordsMatch) {
      for (const word of wordsMatch) {
        syllables += this.countSyllables(word);
      }
    } else {
      syllables = 1;
    }

    // Flesch-Kincaid Grade Level formula
    return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  }

  private static countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const match = word.match(/[aeiouy]{1,2}/g);
    return match ? match.length : 1;
  }
}
