/**
 * Synonym Dictionary for Search Enhancement
 * 
 * Enables conceptual queries like "架构" to find "系统设计" and "技术方案".
 * Bidirectional mapping: both directions are searchable.
 */

// Bidirectional synonym groups: terms that should match each other
const SYNONYM_GROUPS: string[][] = [
  // Architecture & Design
  ['架构', '系统设计', '技术方案', 'architecture', 'design', 'system design', 'tech design'],
  ['API', 'interface', 'endpoint', 'service', '接口'],
  ['database', 'db', '数据库', 'storage'],
  ['authentication', 'auth', 'login', '认证', '登录'],
  
  // Development & Coding
  ['bug', 'defect', 'issue', '缺陷', '问题'],
  ['feature', 'functionality', '功能', 'capability'],
  ['performance', 'optimization', '性能', '优化'],
  ['refactor', 'refactoring', 'code quality', '重构', '代码质量'],
  
  // Testing & Quality
  ['test', 'testing', 'unit test', 'integration test', '测试', '单元测试'],
  ['debug', 'debugging', 'troubleshoot', '调试', '排查'],
  
  // Documentation & Communication
  ['documentation', 'doc', 'guide', 'readme', '文档', '说明书'],
  ['decision', 'choice', 'rationale', '决策', '选择'],
  ['meeting', 'discussion', '会议', '讨论'],
  ['retrospective', 'retro', 'review', '复盘', '回顾'],
  
  // DevOps & Infrastructure
  ['deployment', 'deploy', 'release', '部署', '发布'],
  ['container', 'docker', 'kubernetes', 'k8s', '容器'],
  ['monitoring', 'observability', 'logs', '监控', '可观测性'],
  
  // Project Management
  ['milestone', '里程碑', 'deadline', 'target'],
  ['roadmap', '路线图', 'plan', 'strategy'],
];

// Pre-compute bidirectional mapping: term → all synonyms (including itself)
const termToSynonyms = new Map<string, Set<string>>();

for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    const lower = term.toLowerCase();
    if (!termToSynonyms.has(lower)) {
      termToSynonyms.set(lower, new Set());
    }
    const synonymSet = termToSynonyms.get(lower)!;
    for (const syn of group) {
      synonymSet.add(syn.toLowerCase());
    }
  }
}

/**
 * Expand a query term to include all synonyms.
 * 
 * Example:
 *   expandTermWithSynonyms('架构') → 
 *   ['架构', '系统设计', '技术方案', 'architecture', 'design', 'system design', 'tech design']
 * 
 * Returns the term itself if no synonyms found, so callers don't need null checks.
 */
export function expandTermWithSynonyms(term: string): string[] {
  const lower = term.toLowerCase();
  const synonyms = termToSynonyms.get(lower);
  if (!synonyms) return [term]; // No synonyms found, return original
  return Array.from(synonyms);
}

/**
 * Expand a multi-term query by expanding each term with synonyms.
 * 
 * Example:
 *   expandQueryWithSynonyms('架构设计')
 *   → splits into ['架构', '设计']
 *   → expands each → [[arch-synonyms], [design-synonyms]]
 *   → returns flattened unique list of all expansions
 * 
 * Used by search to create OR-ed candidate queries internally.
 */
export function expandQueryWithSynonyms(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const expanded = new Set<string>();
  
  for (const term of terms) {
    const synonyms = expandTermWithSynonyms(term);
    for (const syn of synonyms) {
      expanded.add(syn);
    }
  }
  
  return Array.from(expanded);
}

/**
 * Check if two terms are synonyms (for deduplication in UI).
 * 
 * Example:
 *   areSynonyms('架构', '系统设计') → true
 *   areSynonyms('architecture', '系统设计') → true
 *   areSynonyms('bug', 'feature') → false
 */
export function areSynonyms(term1: string, term2: string): boolean {
  const lower1 = term1.toLowerCase();
  const lower2 = term2.toLowerCase();
  if (lower1 === lower2) return true;
  
  const synonyms = termToSynonyms.get(lower1);
  return synonyms ? synonyms.has(lower2) : false;
}

/**
 * Get the canonical (primary) form of a term for grouping/deduplication.
 * The canonical form is the first term in the synonym group.
 * 
 * Example:
 *   getCanonicalForm('系统设计') → '架构' (first term in group)
 *   getCanonicalForm('unknown-term') → 'unknown-term' (itself, if not found)
 */
export function getCanonicalForm(term: string): string {
  const lower = term.toLowerCase();
  const synonyms = termToSynonyms.get(lower);
  if (!synonyms) return term;
  
  // Return the first term from the original group that matches any synonym
  for (const group of SYNONYM_GROUPS) {
    for (const groupTerm of group) {
      if (synonyms.has(groupTerm.toLowerCase())) {
        return group[0]; // Return first term as canonical
      }
    }
  }
  
  return term;
}
