/**
 * Detect loops in agent tool call history.
 *
 * Two strategies:
 * 1. Identical repetition: same tool+args N times in a row
 * 2. Pattern cycle: tool sequence repeats (A→B→A→B, A→B→C→A→B→C)
 */

export interface StepEntry {
  tool: string;
  input: string;
}

/**
 * Check if the step history contains a repeating loop.
 * Returns true if a loop is detected.
 */
export function detectLoop(history: StepEntry[], threshold = 3): boolean {
  if (history.length < threshold) return false;

  // Check 1: identical tool+args repeated `threshold` times
  const lastN = history.slice(-threshold);
  if (lastN.every(s => s.tool === lastN[0].tool && s.input === lastN[0].input)) {
    return true;
  }

  // Check 2: pattern cycle detection (e.g. A→B→A→B or A→B→C→A→B→C)
  // Test cycle lengths 2-4 on the last 8 steps
  if (history.length >= 4) {
    const window = history.slice(-8);
    for (let cycleLen = 2; cycleLen <= 4 && cycleLen * 2 <= window.length; cycleLen++) {
      const tail = window.slice(-cycleLen * 2);
      let isPattern = true;
      for (let i = 0; i < cycleLen; i++) {
        if (tail[i].tool !== tail[i + cycleLen].tool) {
          isPattern = false;
          break;
        }
      }
      if (isPattern) return true;
    }
  }

  return false;
}
