/**
 * Measures the size impact of dependency changes by estimating
 * the number of packages added, removed, or changed in a diff.
 */

export interface SizeImpact {
  added: number;
  removed: number;
  changed: number;
  net: number;
}

export interface SizeImpactReport {
  direct: SizeImpact;
  transitive: SizeImpact;
  total: SizeImpact;
}

export type DepMap = Map<string, string>;

export function computeSizeImpact(base: DepMap, head: DepMap): SizeImpact {
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (const [name, version] of head) {
    if (!base.has(name)) {
      added++;
    } else if (base.get(name) !== version) {
      changed++;
    }
  }

  for (const name of base.keys()) {
    if (!head.has(name)) {
      removed++;
    }
  }

  return { added, removed, changed, net: added - removed };
}

export function buildSizeImpactReport(
  baseDirect: DepMap,
  headDirect: DepMap,
  baseTransitive: DepMap,
  headTransitive: DepMap
): SizeImpactReport {
  const direct = computeSizeImpact(baseDirect, headDirect);
  const transitive = computeSizeImpact(baseTransitive, headTransitive);
  const total: SizeImpact = {
    added: direct.added + transitive.added,
    removed: direct.removed + transitive.removed,
    changed: direct.changed + transitive.changed,
    net: direct.net + transitive.net,
  };
  return { direct, transitive, total };
}

export function formatSizeImpactText(report: SizeImpactReport): string {
  const lines: string[] = [];
  lines.push('Size Impact Report');
  lines.push('==================');

  const fmt = (label: string, impact: SizeImpact) =>
    `${label}: +${impact.added} added, -${impact.removed} removed, ~${impact.changed} changed (net ${impact.net > 0 ? '+' : ''}${impact.net})`;

  lines.push(fmt('Direct     ', report.direct));
  lines.push(fmt('Transitive ', report.transitive));
  lines.push(fmt('Total      ', report.total));
  return lines.join('\n');
}
