/**
 * Measures version diversity (entropy) across the dependency tree.
 * High entropy = many different version patterns; low entropy = uniform/pinned.
 */

export interface EntropyEntry {
  name: string;
  versions: string[];
  entropy: number;
  label: 'stable' | 'diverse' | 'chaotic';
}

export interface EntropyReport {
  entries: EntropyEntry[];
  overallEntropy: number;
  summary: string;
}

export type DepMap = Map<string, { version: string; resolved?: string }>;

/**
 * Compute Shannon entropy for a list of version strings.
 * H = -sum(p * log2(p))
 */
export function computeEntropy(versions: string[]): number {
  if (versions.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const v of versions) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / versions.length;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 1000) / 1000;
}

export function classifyEntropy(entropy: number): 'stable' | 'diverse' | 'chaotic' {
  if (entropy === 0) return 'stable';
  if (entropy < 1.5) return 'diverse';
  return 'chaotic';
}

/**
 * Group packages by base name (strip scope) and compute per-package entropy
 * across both dep maps, then compute an overall score.
 */
export function buildEntropyReport(base: DepMap, head: DepMap): EntropyReport {
  const allNames = new Set([...base.keys(), ...head.keys()]);
  const grouped = new Map<string, string[]>();

  for (const name of allNames) {
    const versions: string[] = [];
    const b = base.get(name);
    const h = head.get(name);
    if (b) versions.push(b.version);
    if (h) versions.push(h.version);
    grouped.set(name, versions);
  }

  const entries: EntropyEntry[] = [];
  let totalEntropy = 0;

  for (const [name, versions] of grouped) {
    const entropy = computeEntropy(versions);
    totalEntropy += entropy;
    entries.push({ name, versions, entropy, label: classifyEntropy(entropy) });
  }

  entries.sort((a, b) => b.entropy - a.entropy);

  const overallEntropy =
    entries.length > 0
      ? Math.round((totalEntropy / entries.length) * 1000) / 1000
      : 0;

  const summary = `Overall dependency entropy: ${overallEntropy} (${classifyEntropy(overallEntropy)})`;

  return { entries, overallEntropy, summary };
}

export function formatEntropyReportText(report: EntropyReport): string {
  const lines: string[] = ['## Dependency Entropy Report', report.summary, ''];
  const chaotic = report.entries.filter((e) => e.label === 'chaotic');
  const diverse = report.entries.filter((e) => e.label === 'diverse');

  if (chaotic.length > 0) {
    lines.push('### Chaotic (high version diversity)');
    for (const e of chaotic) {
      lines.push(`  ${e.name}: entropy=${e.entropy} versions=[${e.versions.join(', ')}]`);
    }
    lines.push('');
  }

  if (diverse.length > 0) {
    lines.push('### Diverse');
    for (const e of diverse) {
      lines.push(`  ${e.name}: entropy=${e.entropy} versions=[${e.versions.join(', ')}]`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
