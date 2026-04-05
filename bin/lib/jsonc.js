/**
 * JSONC parser — strips comments before JSON.parse.
 *
 * VS Code-based editors (Cursor, Windsurf, Cline) use JSONC for config files.
 */

export const parseJsonc = (text) => {
  let stripped = text.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*$)/gm, (m, g) => g ? '' : m);
  stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
  if (!stripped.trim()) return {};
  return JSON.parse(stripped);
};
