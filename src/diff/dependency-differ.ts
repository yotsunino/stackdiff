import { ParsedDependency } from '../parser';

export interface DependencyChange {
  name: string;
  type: 'added' | 'removed' | 'upgraded' | 'downgraded';
  from?: string;
  to?: string;
}

export interface DiffResult {
  changes: DependencyChange[];
  breakingChanges: DependencyChange[];
}

function isMajorVersionChange(from: string, to: string): boolean {
  const parseSemver = (v: string) => v.replace(/^[^0-9]*/, '').split('.').map(Number);
  const [fromMajor] = parseSemver(from);
  const [toMajor] = parseSemver(to);
  return toMajor > fromMajor;
}

export function diffDependencies(
  base: Map<string, ParsedDependency>,
  target: Map<string, ParsedDependency>
): DiffResult {
  const changes: DependencyChange[] = [];

  for (const [name, targetDep] of target.entries()) {
    const baseDep = base.get(name);
    if (!baseDep) {
      changes.push({ name, type: 'added', to: targetDep.version });
    } else if (baseDep.version !== targetDep.version) {
      const from = baseDep.version;
      const to = targetDep.version;
      const type = isMajorVersionChange(from, to) ? 'upgraded' : 'upgraded';
      changes.push({ name, type, from, to });
    }
  }

  for (const [name, baseDep] of base.entries()) {
    if (!target.has(name)) {
      changes.push({ name, type: 'removed', from: baseDep.version });
    }
  }

  const breakingChanges = changes.filter((change) => {
    if (change.type === 'removed') return true;
    if (change.type === 'upgraded' && change.from && change.to) {
      return isMajorVersionChange(change.from, change.to);
    }
    return false;
  });

  return { changes, breakingChanges };
}
