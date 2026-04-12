/**
 * dependency-provenance.ts
 * Tracks where each dependency originates (direct, transitive, dev, peer)
 * and surfaces packages whose provenance changes between lock files.
 */

export type ProvenanceType = 'direct' | 'transitive' | 'dev' | 'peer' | 'unknown';

export interface ProvenanceEntry {
  name: string;
  version: string;
  provenance: ProvenanceType;
}

export interface ProvenanceChange {
  name: string;
  from: ProvenanceType;
  to: ProvenanceType;
  version: string;
}

export interface ProvenanceReport {
  changes: ProvenanceChange[];
  added: ProvenanceEntry[];
  removed: ProvenanceEntry[];
}

export function classifyProvenance(
  name: string,
  directDeps: Set<string>,
  devDeps: Set<string>,
  peerDeps: Set<string>
): ProvenanceType {
  if (peerDeps.has(name)) return 'peer';
  if (devDeps.has(name)) return 'dev';
  if (directDeps.has(name)) return 'direct';
  return 'transitive';
}

export function buildProvenanceMap(
  packages: Record<string, string>,
  directDeps: Set<string>,
  devDeps: Set<string>,
  peerDeps: Set<string>
): Map<string, ProvenanceEntry> {
  const map = new Map<string, ProvenanceEntry>();
  for (const [name, version] of Object.entries(packages)) {
    map.set(name, {
      name,
      version,
      provenance: classifyProvenance(name, directDeps, devDeps, peerDeps),
    });
  }
  return map;
}

export function diffProvenance(
  base: Map<string, ProvenanceEntry>,
  head: Map<string, ProvenanceEntry>
): ProvenanceReport {
  const changes: ProvenanceChange[] = [];
  const added: ProvenanceEntry[] = [];
  const removed: ProvenanceEntry[] = [];

  for (const [name, headEntry] of head) {
    const baseEntry = base.get(name);
    if (!baseEntry) {
      added.push(headEntry);
    } else if (baseEntry.provenance !== headEntry.provenance) {
      changes.push({
        name,
        from: baseEntry.provenance,
        to: headEntry.provenance,
        version: headEntry.version,
      });
    }
  }

  for (const [name, baseEntry] of base) {
    if (!head.has(name)) {
      removed.push(baseEntry);
    }
  }

  return { changes, added, removed };
}

export function formatProvenanceReportText(report: ProvenanceReport): string {
  const lines: string[] = ['## Dependency Provenance Report'];

  if (report.changes.length > 0) {
    lines.push('\n### Provenance Changes');
    for (const c of report.changes) {
      lines.push(`  - ${c.name}@${c.version}: ${c.from} → ${c.to}`);
    }
  }

  if (report.added.length > 0) {
    lines.push('\n### Newly Added');
    for (const e of report.added) {
      lines.push(`  + ${e.name}@${e.version} (${e.provenance})`);
    }
  }

  if (report.removed.length > 0) {
    lines.push('\n### Removed');
    for (const e of report.removed) {
      lines.push(`  - ${e.name}@${e.version} (${e.provenance})`);
    }
  }

  if (report.changes.length === 0 && report.added.length === 0 && report.removed.length === 0) {
    lines.push('\nNo provenance changes detected.');
  }

  return lines.join('\n');
}
