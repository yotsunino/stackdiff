import { parseVersion, isBreakingChange } from './version-resolver';

export interface TransitiveDep {
  name: string;
  version: string;
  requiredBy: string[];
}

export interface TransitiveConflict {
  name: string;
  baseVersion: string;
  headVersion: string;
  requiredBy: string[];
  breaking: boolean;
}

/**
 * Flatten nested dependency nodes into a map of name -> TransitiveDep.
 * `requiredBy` tracks which top-level packages pulled in each dep.
 */
export function flattenTransitiveDeps(
  deps: Record<string, { version: string; dependencies?: Record<string, { version: string }> }>,
  parent = 'root'
): Map<string, TransitiveDep> {
  const result = new Map<string, TransitiveDep>();

  for (const [name, meta] of Object.entries(deps)) {
    const existing = result.get(name);
    if (existing) {
      if (!existing.requiredBy.includes(parent)) {
        existing.requiredBy.push(parent);
      }
    } else {
      result.set(name, { name, version: meta.version, requiredBy: [parent] });
    }

    if (meta.dependencies) {
      const nested = flattenTransitiveDeps(meta.dependencies, name);
      for (const [nName, nDep] of nested) {
        const ex = result.get(nName);
        if (ex) {
          for (const rb of nDep.requiredBy) {
            if (!ex.requiredBy.includes(rb)) ex.requiredBy.push(rb);
          }
        } else {
          result.set(nName, nDep);
        }
      }
    }
  }

  return result;
}

/**
 * Compare two flattened transitive dep maps and return conflicts.
 */
export function findTransitiveConflicts(
  base: Map<string, TransitiveDep>,
  head: Map<string, TransitiveDep>
): TransitiveConflict[] {
  const conflicts: TransitiveConflict[] = [];

  for (const [name, headDep] of head) {
    const baseDep = base.get(name);
    if (!baseDep) continue;
    if (baseDep.version === headDep.version) continue;

    const baseV = parseVersion(baseDep.version);
    const headV = parseVersion(headDep.version);
    const breaking = isBreakingChange(baseV, headV);

    conflicts.push({
      name,
      baseVersion: baseDep.version,
      headVersion: headDep.version,
      requiredBy: headDep.requiredBy,
      breaking,
    });
  }

  return conflicts;
}
