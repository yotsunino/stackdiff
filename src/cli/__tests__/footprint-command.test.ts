import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runFootprintCommand } from '../footprint-command';

function writeTempLock(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-footprint-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, content);
  return file;
}

function makeLock(deps: Record<string, { version: string; requires?: Record<string, string>; dev?: boolean }>) {
  return JSON.stringify({
    name: 'test-app',
    version: '1.0.0',
    lockfileVersion: 2,
    packages: Object.fromEntries(
      Object.entries(deps).map(([name, meta]) => [
        `node_modules/${name}`,
        { version: meta.version, requires: meta.requires, dev: meta.dev },
      ])
    ),
  });
}

describe('runFootprintCommand', () => {
  it('throws if lock file does not exist', async () => {
    await expect(
      runFootprintCommand({ lockFile: '/no/such/file.json', format: 'text' })
    ).rejects.toThrow('Lock file not found');
  });

  it('returns text output for a simple lock file', async () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const file = writeTempLock(lock);
    const result = await runFootprintCommand({ lockFile: file, format: 'text' });
    expect(typeof result).toBe('string');
  });

  it('returns valid JSON when format is json', async () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const file = writeTempLock(lock);
    const result = await runFootprintCommand({ lockFile: file, format: 'json' });
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('entries');
    expect(parsed).toHaveProperty('totalDirect');
    expect(parsed).toHaveProperty('totalTransitive');
  });

  it('respects the top option', async () => {
    const lock = makeLock({
      a: { version: '1.0.0' },
      b: { version: '1.0.0' },
      c: { version: '1.0.0' },
    });
    const file = writeTempLock(lock);
    const result = await runFootprintCommand({ lockFile: file, format: 'json', top: 1 });
    const parsed = JSON.parse(result);
    expect(parsed.entries.length).toBeLessThanOrEqual(1);
  });
});
