import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runOverlapCommand } from '../overlap-command';

function writeTempLock(dir: string, name: string, deps: Record<string, string>): string {
  const packages: Record<string, unknown> = { '': { dependencies: {} } };
  for (const [pkg, version] of Object.entries(deps)) {
    packages[`node_modules/${pkg}`] = { version, resolved: '', integrity: '' };
  }
  const content = JSON.stringify({
    name: 'test',
    version: '1.0.0',
    lockfileVersion: 3,
    packages,
  });
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('runOverlapCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overlap-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prints text report for identical lock files', async () => {
    const lockA = writeTempLock(tmpDir, 'lockA.json', { react: '18.0.0' });
    const lockB = writeTempLock(tmpDir, 'lockB.json', { react: '18.0.0' });
    const output: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((s) => { output.push(s as string); return true; });
    await runOverlapCommand({ lockA, lockB, format: 'text' });
    expect(output.join('')).toContain('Overlap Score: 100%');
    jest.restoreAllMocks();
  });

  it('prints json report when format is json', async () => {
    const lockA = writeTempLock(tmpDir, 'lockA.json', { react: '18.0.0' });
    const lockB = writeTempLock(tmpDir, 'lockB.json', { react: '18.0.0' });
    const output: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((s) => { output.push(s as string); return true; });
    await runOverlapCommand({ lockA, lockB, format: 'json' });
    const parsed = JSON.parse(output.join(''));
    expect(parsed).toHaveProperty('overlapScore');
    jest.restoreAllMocks();
  });

  it('sets exitCode when overlap is below threshold', async () => {
    const lockA = writeTempLock(tmpDir, 'lockA.json', { react: '18.0.0' });
    const lockB = writeTempLock(tmpDir, 'lockB.json', { lodash: '4.17.21' });
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await runOverlapCommand({ lockA, lockB, minOverlap: 50 });
    expect(process.exitCode).toBe(1);
    jest.restoreAllMocks();
  });

  it('throws when lock file A does not exist', async () => {
    const lockB = writeTempLock(tmpDir, 'lockB.json', { react: '18.0.0' });
    await expect(
      runOverlapCommand({ lockA: '/nonexistent/lock.json', lockB })
    ).rejects.toThrow('Lock file not found');
  });

  it('throws when lock file B does not exist', async () => {
    const lockA = writeTempLock(tmpDir, 'lockA.json', { react: '18.0.0' });
    await expect(
      runOverlapCommand({ lockA, lockB: '/nonexistent/lock.json' })
    ).rejects.toThrow('Lock file not found');
  });
});
