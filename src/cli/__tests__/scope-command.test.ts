import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runScopeCommand } from '../scope-command';

function writeTempLock(content: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-scope-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, JSON.stringify(content));
  return file;
}

function makeLock(deps: Record<string, { version: string; dev?: boolean }>) {
  return {
    lockfileVersion: 2,
    name: 'test',
    version: '1.0.0',
    dependencies: deps,
  };
}

describe('runScopeCommand', () => {
  it('returns text report by default', () => {
    const lock = writeTempLock(makeLock({
      react: { version: '18.0.0' },
      jest: { version: '29.0.0', dev: true },
    }));
    const output = runScopeCommand({ lockFile: lock });
    expect(output).toContain('Dependency Scope Report');
  });

  it('returns json when json flag is set', () => {
    const lock = writeTempLock(makeLock({ lodash: { version: '4.17.21' } }));
    const output = runScopeCommand({ lockFile: lock, json: true });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('scope');
    expect(parsed).toHaveProperty('entries');
  });

  it('filters by scope when scope option is provided', () => {
    const lock = writeTempLock(makeLock({
      react: { version: '18.0.0' },
      jest: { version: '29.0.0', dev: true },
    }));
    const output = runScopeCommand({ lockFile: lock, scope: 'development' });
    expect(output).toContain('jest');
    expect(output).not.toContain('react@');
  });

  it('throws when lock file does not exist', () => {
    expect(() =>
      runScopeCommand({ lockFile: '/nonexistent/package-lock.json' })
    ).toThrow('Lock file not found');
  });
});
