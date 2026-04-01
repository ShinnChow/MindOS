import { describe, it, expect } from 'vitest';
import { detectLoop, type StepEntry } from '@/lib/agent/loop-detection';

function step(tool: string, input = ''): StepEntry {
  return { tool, input };
}

describe('detectLoop', () => {
  describe('identical repetition', () => {
    it('detects 3 identical calls in a row', () => {
      const history = [step('readFile', 'a.md'), step('readFile', 'a.md'), step('readFile', 'a.md')];
      expect(detectLoop(history)).toBe(true);
    });

    it('does not trigger with only 2 identical calls', () => {
      const history = [step('readFile', 'a.md'), step('readFile', 'a.md')];
      expect(detectLoop(history)).toBe(false);
    });

    it('does not trigger with different args', () => {
      const history = [step('readFile', 'a.md'), step('readFile', 'b.md'), step('readFile', 'c.md')];
      expect(detectLoop(history)).toBe(false);
    });
  });

  describe('pattern cycle detection', () => {
    it('detects A→B→A→B cycle', () => {
      const history = [step('readFile'), step('writeFile'), step('readFile'), step('writeFile')];
      expect(detectLoop(history)).toBe(true);
    });

    it('detects A→B→C→A→B→C cycle', () => {
      const history = [
        step('read'), step('search'), step('write'),
        step('read'), step('search'), step('write'),
      ];
      expect(detectLoop(history)).toBe(true);
    });

    it('does not trigger for non-repeating sequence', () => {
      const history = [step('read'), step('search'), step('write'), step('commit')];
      expect(detectLoop(history)).toBe(false);
    });

    it('detects cycle even with earlier non-repeating history', () => {
      const history = [
        step('init'), step('config'), // noise
        step('read'), step('write'), step('read'), step('write'), // cycle
      ];
      expect(detectLoop(history)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty history', () => {
      expect(detectLoop([])).toBe(false);
    });

    it('returns false for single entry', () => {
      expect(detectLoop([step('read')])).toBe(false);
    });

    it('returns false for short non-repeating history', () => {
      expect(detectLoop([step('a'), step('b'), step('c')])).toBe(false);
    });
  });
});
