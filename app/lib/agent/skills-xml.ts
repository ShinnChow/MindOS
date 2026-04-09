function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Generate <available_skills> XML for third-party skills.
 * Instructs the LLM to use `load_skill` (not the framework's `read` tool).
 * Omits <location> since load_skill resolves by name.
 */
export function generateSkillsXml(skills: Array<{ name: string; description: string }>): string {
  const lines = [
    'The following skills provide specialized instructions for specific tasks.',
    'Use the load_skill tool to load a skill\'s full content when a task matches its description.',
    '',
    '<available_skills>',
  ];
  for (const skill of skills) {
    lines.push('  <skill>');
    lines.push(`    <name>${escapeXml(skill.name)}</name>`);
    lines.push(`    <description>${escapeXml(skill.description)}</description>`);
    lines.push('  </skill>');
  }
  lines.push('</available_skills>');
  return lines.join('\n');
}
