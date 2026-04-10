import * as fs from 'fs';
import * as path from 'path';
import { DependencyMap } from '../parser';

export interface Snapshot {
  branch: string;
  timestamp: number;
  dependencies: DependencyMap;
}

const SNAPSHOT_DIR = '.stackdiff/snapshots';

export function snapshotPath(branch: string): string {
  const safe = branch.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(SNAPSHOT_DIR, `${safe}.json`);
}

export function saveSnapshot(branch: string, deps: DependencyMap): void {
  const dir = path.dirname(snapshotPath(branch));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const snapshot: Snapshot = {
    branch,
    timestamp: Date.now(),
    dependencies: deps,
  };
  fs.writeFileSync(snapshotPath(branch), JSON.stringify(snapshot, null, 2), 'utf-8');
}

export function loadSnapshot(branch: string): Snapshot | null {
  const p = snapshotPath(branch);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

export function listSnapshots(): string[] {
  if (!fs.existsSync(SNAPSHOT_DIR)) return [];
  return fs.readdirSync(SNAPSHOT_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, '').replace(/_/g, '/'));
}

export function deleteSnapshot(branch: string): boolean {
  const p = snapshotPath(branch);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}
