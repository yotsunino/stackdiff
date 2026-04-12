import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runHealthCommand } from '../health-command';

function writeTempLock(content: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-health-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, JSON.stringify(content));
  return file;
}

function makeLock(packages: Record<string, string>) {
  return {
    lockfileVersion: 2,
    packages: Object.fromEntries(
      Object.entries(packages).map(([name, version]) => [
        `node_modules/${name}`,
        { version, resolved: `https://registry/${name}`, integrity: 'sha512-abc' },
      ])
    ),
  };
}

describe('runHealthCommand', () => {
  it('throws when lock file does not exist', () => {
    expect(() =>
      runHealthCommand({ lockFile: '/no/such/file.json', format: 'text' })
    ).toThrow('Lock file not found');
  });

  it('returns text report for healthy deps', () => {
    const lock = writeTempLock(makeLock({ express: '4.18.2', chalk: '5.3.0' }));
    const output = runHealthCommand({ lockFile: lock, format: 'text', minStatus: 'warning' });
    expect(output).toContain('Dependency Health Report');
  });

  it('surfaces deprecated packages in text output', () => {
    const lock = writeTempLock(makeLock({ request: '2.88.2', express: '4.18.2' }));
    const output = runHealthCommand({ lockFile: lock, format: 'text', minStatus: 'warning' });
    expect(output).toContain('WARNING');
    expect(output).toContain('request');
  });

  it('returns json format when requested', () => {
    const lock = writeTempLock(makeLock({ express: '4.18.2' }));
    const output = runHealthCommand({ lockFile: lock, format: 'json', minStatus: 'healthy' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('health');
    expect(parsed.health).toHaveProperty('summary');
  });

  it('filters out entries below minStatus threshold', () => {
    const lock = writeTempLock(makeLock({ request: '2.88.2', 'node-uuid': '1.4.8' }));
    const output = runHealthCommand({ lockFile: lock, format: 'json', minStatus: 'critical' });
    const parsed = JSON.parse(output);
    expect(parsed.health.entries.every((e: { status: string }) => e.status === 'critical')).toBe(true);
  });

  it('summary counts match filtered entries', () => {
    const lock = writeTempLock(makeLock({ 'node-uuid': '1.4.8', express: '4.18.2' }));
    const output = runHealthCommand({ lockFile: lock, format: 'json', minStatus: 'critical' });
    const parsed = JSON.parse(output);
    expect(parsed.health.summary.critical).toBe(1);
    expect(parsed.health.summary.healthy).toBe(0);
  });
});
