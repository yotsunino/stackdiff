import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runRedundancyCommand } from '../redundancy-command';

function writeTempLock(dir: string, name: string, content: object): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  return filePath;
}

function makeLock(deps: Record<string, { version: string; dependencies?: Record<string, string> }>) {
  return {
    lockfileVersion: 2,
    packages: Object.fromEntries(
      Object.entries(deps).map(([name, info]) => [
        `node_modules/${name}`,
        { version: info.version, dependencies: info.dependencies ?? {} },
      ])
    ),
  };
}

describe('runRedundancyCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-redundancy-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns no redundancy message when deps are clean', async () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const base = writeTempLock(tmpDir, 'base-lock.json', lock);
    const head = writeTempLock(tmpDir, 'head-lock.json', lock);
    const result = await runRedundancyCommand({ base, head });
    expect(result).toContain('No redundant dependencies detected');
  });

  it('detects aliased redundancy and returns text', async () => {
    const baseLock = makeLock({ lodash: { version: '4.17.21' } });
    const headLock = makeLock({
      lodash: { version: '4.17.21' },
      'lodash-es': { version: '4.17.21' },
    });
    const base = writeTempLock(tmpDir, 'base-lock.json', baseLock);
    const head = writeTempLock(tmpDir, 'head-lock.json', headLock);
    const result = await runRedundancyCommand({ base, head });
    expect(result).toContain('aliased');
  });

  it('returns JSON when format is json', async () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const base = writeTempLock(tmpDir, 'base-lock.json', lock);
    const head = writeTempLock(tmpDir, 'head-lock.json', lock);
    const result = await runRedundancyCommand({ base, head, format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.command).toBe('redundancy');
    expect(parsed.totalRedundant).toBe(0);
  });

  it('throws if base file is missing', async () => {
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLock({}));
    await expect(
      runRedundancyCommand({ base: path.join(tmpDir, 'missing.json'), head })
    ).rejects.toThrow('Base lock file not found');
  });
});
