import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runVisibilityCommand } from '../visibility-command';

function writeTempLock(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-vis-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, content);
  return file;
}

function makeLock(deps: Record<string, { version: string }>): string {
  return JSON.stringify({
    lockfileVersion: 2,
    packages: Object.fromEntries(
      Object.entries(deps).map(([name, meta]) => [
        `node_modules/${name}`,
        { version: meta.version },
      ])
    ),
  });
}

describe('runVisibilityCommand', () => {
  it('throws if lock file does not exist', async () => {
    await expect(
      runVisibilityCommand({ lockFile: '/nonexistent/package-lock.json' })
    ).rejects.toThrow('Lock file not found');
  });

  it('returns text report for mixed deps', async () => {
    const lock = makeLock({
      react: { version: '18.0.0' },
      '@babel/core': { version: '7.0.0' },
      lodash: { version: '4.17.21' },
    });
    const file = writeTempLock(lock);
    const result = await runVisibilityCommand({ lockFile: file });
    expect(result).toContain('Public:');
    expect(result).toContain('Scoped:');
    expect(result).toContain('react@18.0.0');
  });

  it('returns JSON when json option is true', async () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const file = writeTempLock(lock);
    const result = await runVisibilityCommand({ lockFile: file, json: true });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('publicCount');
    expect(parsed).toHaveProperty('entries');
  });

  it('filters by scope when scopeFilter is provided', async () => {
    const lock = makeLock({
      lodash: { version: '4.0.0' },
      '@myorg/utils': { version: '1.0.0' },
      '@myorg/core': { version: '2.0.0' },
    });
    const file = writeTempLock(lock);
    const result = await runVisibilityCommand({
      lockFile: file,
      scopeFilter: '@myorg',
    });
    expect(result).toContain('@myorg/utils');
    expect(result).toContain('@myorg/core');
    expect(result).not.toContain('lodash');
  });
});
