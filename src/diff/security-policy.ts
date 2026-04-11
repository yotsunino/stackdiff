import { DependencyMap } from '../parser';

export type PolicyRule = {
  package: string;
  maxVersion?: string;
  minVersion?: string;
  forbidden?: boolean;
  reason?: string;
};

export type PolicyViolation = {
  package: string;
  version: string;
  rule: PolicyRule;
  message: string;
};

export type PolicyReport = {
  violations: PolicyViolation[];
  checked: number;
};

export function checkAgainstPolicy(
  deps: DependencyMap,
  rules: PolicyRule[]
): PolicyReport {
  const violations: PolicyViolation[] = [];
  let checked = 0;

  for (const [pkg, entry] of Object.entries(deps)) {
    const rule = rules.find((r) => r.package === pkg || r.package === '*');
    if (!rule) continue;
    checked++;

    const version = entry.version;

    if (rule.forbidden) {
      violations.push({
        package: pkg,
        version,
        rule,
        message: `Package "${pkg}@${version}" is forbidden. ${rule.reason ?? ''}`.trim(),
      });
      continue;
    }

    if (rule.maxVersion && compareSimple(version, rule.maxVersion) > 0) {
      violations.push({
        package: pkg,
        version,
        rule,
        message: `Package "${pkg}@${version}" exceeds max allowed version ${rule.maxVersion}. ${rule.reason ?? ''}`.trim(),
      });
    }

    if (rule.minVersion && compareSimple(version, rule.minVersion) < 0) {
      violations.push({
        package: pkg,
        version,
        rule,
        message: `Package "${pkg}@${version}" is below min required version ${rule.minVersion}. ${rule.reason ?? ''}`.trim(),
      });
    }
  }

  return { violations, checked };
}

function compareSimple(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function formatPolicyReportText(report: PolicyReport): string {
  if (report.violations.length === 0) {
    return `Security policy: all ${report.checked} checked package(s) passed.\n`;
  }
  const lines = [`Security policy violations (${report.violations.length}):`, ''];
  for (const v of report.violations) {
    lines.push(`  ✖ ${v.message}`);
  }
  return lines.join('\n') + '\n';
}
