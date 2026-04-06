import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

/**
 * Extract text from a PDF file via pdfjs-dist (child process).
 * Spawns extract-pdf.cjs to avoid Turbopack/pdfjs-dist worker conflicts.
 * Returns extracted text, or empty string if extraction fails.
 */
export function extractPdfText(absolutePath: string): string {
  try {
    const appDir = process.env.MINDOS_PROJECT_ROOT
      ? path.join(process.env.MINDOS_PROJECT_ROOT, 'app')
      : path.resolve(process.cwd());
    const scriptPath = path.join(appDir, 'scripts', 'extract-pdf.cjs');
    if (!fs.existsSync(scriptPath)) return '';

    const stdout = execFileSync('node', [scriptPath, absolutePath], {
      encoding: 'utf-8',
      timeout: 15_000,
      maxBuffer: 5 * 1024 * 1024,
    });
    const result = JSON.parse(stdout) as { text: string; pages: number };
    return result.text || '';
  } catch {
    return '';
  }
}
