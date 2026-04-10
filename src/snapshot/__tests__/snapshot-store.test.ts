import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { saveSnapshot, loadSnapshot, listSnapshots, deleteSnapshot, snapshotPath } from '../snapshot-store';
import { DependencyMap } from '../../parser';

const deps: DependencyMap = new Map([
  ['react', { name: 'react', version: '18.0.0', resolved: '', dependencies: {} }],
]);

let originalCwd: string;
let tmpDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-snap-'));
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('snapshotPath', () => {
  it('sanitises branch names with slashes', () => {
    const p = snapshotPath('feature/my-branch');
    expect(p).not.toContain('/');
    expect(p).toContain('feature_my-branch');
  });
});

describe('saveSnapshot / loadSnapshot', () => {
  it('round-trips a snapshot', () => {
    saveSnapshot('main', deps);
    const snap = loadSnapshot('main');
    expect(snap).not.toBeNull();
    expect(snap!.branch).toBe('main');
    expect(snap!.dependencies.get('react')?.version).toBe('18.0.0');
  });

  it('returns null for missing snapshot', () => {
    expect(loadSnapshot('nonexistent')).toBeNull();
  });
});

describe('listSnapshots', () => {
  it('returns empty array when no snapshots exist', () => {
    expect(listSnapshots()).toEqual([]);
  });

  it('lists saved snapshots', () => {
    saveSnapshot('main', deps);
    saveSnapshot('develop', deps);
    const list = listSnapshots();
    expect(list.length).toBe(2);
  });
});

describe('deleteSnapshot', () => {
  it('deletes an existing snapshot', () => {
    saveSnapshot('main', deps);
    expect(deleteSnapshot('main')).toBe(true);
    expect(loadSnapshot('main')).toBeNull();
  });

  it('returns false when snapshot does not exist', () => {
    expect(deleteSnapshot('ghost')).toBe(false);
  });
});
