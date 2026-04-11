import { checkAgainstPolicy, formatPolicyReportText, PolicyRule } from '../security-policy';
import { DependencyMap } from '../../parser';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  const map: DependencyMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', integrity: '', dependencies: {} };
  }
  return map;
}

const rules: PolicyRule[] = [
  { package: 'lodash', maxVersion: '4.17.20', reason: 'Known vuln above this version' },
  { package: 'moment', forbidden: true, reason: 'Deprecated, use date-fns' },
  { package: 'axios', minVersion: '1.0.0', reason: 'Security fix in 1.x' },
];

describe('checkAgainstPolicy', () => {
  it('returns no violations when all deps comply', () => {
    const deps = makeDepMap({ lodash: '4.17.19', axios: '1.2.0' });
    const report = checkAgainstPolicy(deps, rules);
    expect(report.violations).toHaveLength(0);
    expect(report.checked).toBe(2);
  });

  it('flags a forbidden package', () => {
    const deps = makeDepMap({ moment: '2.29.4' });
    const report = checkAgainstPolicy(deps, rules);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].message).toContain('forbidden');
    expect(report.violations[0].message).toContain('Deprecated');
  });

  it('flags a package exceeding maxVersion', () => {
    const deps = makeDepMap({ lodash: '4.17.21' });
    const report = checkAgainstPolicy(deps, rules);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].message).toContain('exceeds max');
  });

  it('flags a package below minVersion', () => {
    const deps = makeDepMap({ axios: '0.27.2' });
    const report = checkAgainstPolicy(deps, rules);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].message).toContain('below min');
  });

  it('skips packages not covered by any rule', () => {
    const deps = makeDepMap({ react: '18.0.0' });
    const report = checkAgainstPolicy(deps, rules);
    expect(report.violations).toHaveLength(0);
    expect(report.checked).toBe(0);
  });

  it('handles multiple violations', () => {
    const deps = makeDepMap({ moment: '2.29.4', lodash: '5.0.0', axios: '0.21.0' });
    const report = checkAgainstPolicy(deps, rules);
    expect(report.violations).toHaveLength(3);
  });
});

describe('formatPolicyReportText', () => {
  it('shows pass message when no violations', () => {
    const text = formatPolicyReportText({ violations: [], checked: 5 });
    expect(text).toContain('5 checked package(s) passed');
  });

  it('lists violations when present', () => {
    const deps = makeDepMap({ moment: '2.29.4' });
    const report = checkAgainstPolicy(deps, rules);
    const text = formatPolicyReportText(report);
    expect(text).toContain('violations (1)');
    expect(text).toContain('✖');
  });
});
