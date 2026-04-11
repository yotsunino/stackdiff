import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runScoreCommand } from '../score-command';

function writeTempLock(content: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-score-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, JSON.stringify(content));
  return file;
}

function makeLock(deps: Record<string, { version: string }>) {
  return {
    lockfileVersion: 2,
    packages: Object.fromEntries(
      Object.entries(deps).map(([name, info]) => [
        `node_modules/${name}`,
        { version: info.version, resolved: `https://registry.npmjs.org/${name}`, integrity: 'sha512-abc' },
      ])
    ),
  };
}

describe('runScoreCommand', () => {
  it('returns perfect score for identical lock files', () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const base = writeTempLock(lock);
    const head = writeTempLock(lock);
    const output = runScoreCommand({ base, head });
    expect(output).toContain('100/100');
    expect(output).toContain('A');
  });

  it('deducts points when a package is added', () => {
    const base = writeTempLock(makeLock({ lodash: { version: '4.17.21' } }));
    const head = writeTempLock(makeLock({ lodash: { version: '4.17.21' }, axios: { version: '1.0.0' } }));
    const output = runScoreCommand({ base, head });
    expect(output).toContain('added');
    expect(output).not.toContain('100/100');
  });

  it('outputs JSON when format is json', () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const base = writeTempLock(lock);
    const head = writeTempLock(lock);
    const output = runScoreCommand({ base, head, format: 'json' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('score', 100);
    expect(parsed).toHaveProperty('grade', 'A');
    expect(parsed.breakdown.deductions).toHaveLength(0);
  });

  it('reflects major downgrade in score', () => {
    const base = writeTempLock(makeLock({ react: { version: '18.0.0' } }));
    const head = writeTempLock(makeLock({ react: { version: '16.0.0' } }));
    const output = runScoreCommand({ base, head });
    expect(output).toContain('downgrade');
  });
});
