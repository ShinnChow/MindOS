import { describe, it, expect } from 'vitest';
import { 
  expandTermWithSynonyms, 
  expandQueryWithSynonyms, 
  areSynonyms,
  getCanonicalForm 
} from '../synonym-dict';

describe('Synonym Dictionary', () => {
  describe('expandTermWithSynonyms', () => {
    it('should expand architecture-related terms', () => {
      const result = expandTermWithSynonyms('架构');
      expect(result).toContain('架构');
      expect(result).toContain('系统设计');
      expect(result).toContain('技术方案');
      expect(result).toContain('architecture');
    });

    it('should expand database synonyms', () => {
      const result = expandTermWithSynonyms('数据库');
      expect(result).toContain('数据库');
      expect(result).toContain('database');
      expect(result).toContain('db');
    });

    it('should be case-insensitive', () => {
      const result1 = expandTermWithSynonyms('DATABASE');
      const result2 = expandTermWithSynonyms('database');
      expect(result1).toEqual(result2);
    });

    it('should return original term if no synonyms found', () => {
      const result = expandTermWithSynonyms('unknown-xyz-term');
      expect(result).toEqual(['unknown-xyz-term']);
    });
  });

  describe('expandQueryWithSynonyms', () => {
    it('should expand multi-term queries', () => {
      const result = expandQueryWithSynonyms('架构 设计');
      expect(result).toContain('系统设计');
      expect(result).toContain('技术方案');
    });

    it('should deduplicate results', () => {
      const result = expandQueryWithSynonyms('数据库 database');
      const uniqueSet = new Set(result);
      expect(uniqueSet.size).toBe(result.length);
    });
  });

  describe('areSynonyms', () => {
    it('should recognize synonyms', () => {
      expect(areSynonyms('架构', '系统设计')).toBe(true);
      expect(areSynonyms('database', 'db')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(areSynonyms('DATABASE', 'db')).toBe(true);
    });

    it('should return true for identical terms', () => {
      expect(areSynonyms('database', 'database')).toBe(true);
    });

    it('should return false for non-synonyms', () => {
      expect(areSynonyms('bug', 'feature')).toBe(false);
    });
  });

  describe('getCanonicalForm', () => {
    it('should return canonical form', () => {
      const canonical = getCanonicalForm('系统设计');
      expect(canonical).toBe('架构');
    });

    it('should handle unknown terms', () => {
      const result = getCanonicalForm('unknown-term');
      expect(result).toBe('unknown-term');
    });
  });
});
