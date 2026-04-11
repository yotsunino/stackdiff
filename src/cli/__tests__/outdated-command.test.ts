import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runOutdatedCommand } from '../outdated-command';

const LOCK_V1_TEMPLATE = (deps: Record<string, string>) => JSON.stringify({
  lockfileVersion: 1,
  dependencies: Object.fromEntries(
    Object.entries(deps).map(([k, v]) => [k, { version: v }])
  ),
});

function writeTempLock(deps: Record<string, string>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-'));
  const filePath = path.join(tmpDir, 'package-lock.json');
  fs.writeFileSync(filePath, LOCK_V1_TEMPLATE(deps));
  return filePath;
}

describe('runOutdatedCommand', () => {
  it('returns up-to-date message when nothing changed', () => {
    const current = writeTempLock({ react: '18.0.0' });
    const latest = writeTempLock({ react: '18.0.0' });
    const result = runOutdatedCommand({ current, latest });
    expect(result).toContain('up to date');
  });

  it('detects a major version bump', () => {
    const current = writeTempLock({ lodash: '3.10.1' });
    const latest = writeTempLock({ lodash: '4.17.21' });
    const result = runOutdatedCommand({ current, latest });
    expect(result).toContain('[MAJOR]');
    expect(result).toContain('lodash');
  });

  it('outputs JSON when format is json', () => {
    const current = writeTempLock({ axios: '1.0.0' });
    const latest = writeTempLock({ axios: '1.1.0' });
    const result = runOutdatedCommand({ current, latest, format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('entries');
    expect(parsed.total).toBe(1);
  });

  it('filters by severity threshold', () => {
    const current = writeTempLock({ axios: '1.0.0', lodash: '3.0.0' });
    const latest = writeTempLock({ axios: '1.1.0', lodash: '4.0.0' });
    const result = runOutdatedCommand({ current, latest, severity: 'major' });
    expect(result).toContain('lodash');
    expect(result).not.toContain('axios');
  });

  it('throws when current file does not exist', () => {
    expect(() =>
      runOutdatedCommand({ current: '/nonexistent/lock.json', latest: '/nonexistent/lock2.json' })
    ).toThrow('File not found');
  });
});
