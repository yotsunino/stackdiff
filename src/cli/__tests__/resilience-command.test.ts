import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runResilienceCommand, meetsResilienceThreshold } from '../resilience-command';

function writeTempLock(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-resilience-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, content);
  return file;
}

function makeLock(packages: Record<string, { version: string; dependencies?: Record<string, string> }>): string {
  return JSON.stringify({ lockfileVersion: 2, packages });
}

describe('meetsResilienceThreshold', () => {
  it('returns true when score meets threshold', () => {
    expect(meetsResilienceThreshold(80, 70)).toBe(true);
  });

  it('returns false when score is below threshold', () => {
    expect(meetsResilienceThreshold(50, 70)).toBe(false);
  });

  it('returns true when score equals threshold', () => {
    expect(meetsResilienceThreshold(70, 70)).toBe(true);
  });
});

describe('runResilienceCommand', () => {
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = 0;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = 0;
  });

  it('prints text report by default', async () => {
    const lock = makeLock({
      'node_modules/lodash': { version: '4.17.21' },
    });
    const file = writeTempLock(lock);
    await runResilienceCommand({ lockFile: file });
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c: string[]) => c.join('')).join('\n');
    expect(output).toContain('Dependency Resilience Report');
  });

  it('prints JSON when --json flag is set', async () => {
    const lock = makeLock({ 'node_modules/react': { version: '18.0.0' } });
    const file = writeTempLock(lock);
    await runResilienceCommand({ lockFile: file, json: true });
    const output = consoleSpy.mock.calls.map((c: string[]) => c.join('')).join('');
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('sets exitCode 1 when lock file is missing', async () => {
    await runResilienceCommand({ lockFile: '/nonexistent/package-lock.json' });
    expect(process.exitCode).toBe(1);
  });

  it('sets exitCode 1 when score is below threshold', async () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 12; i++) deps[`dep-${i}`] = '^1.0.0';
    const pkgs: Record<string, { version: string; dependencies?: Record<string, string> }> = {
      'node_modules/root': { version: '1.0.0', dependencies: deps },
    };
    for (let i = 0; i < 12; i++) {
      pkgs[`node_modules/dep-${i}`] = { version: '1.0.0', dependencies: { 'shared-core': '^1.0.0' } };
    }
    pkgs['node_modules/shared-core'] = { version: '1.0.0' };
    const lock = makeLock(pkgs);
    const file = writeTempLock(lock);
    await runResilienceCommand({ lockFile: file, threshold: 99 });
    expect(process.exitCode).toBe(1);
  });
});
