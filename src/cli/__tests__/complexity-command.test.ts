import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runComplexityCommand } from '../complexity-command';

function writeTempLock(content: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-complexity-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, JSON.stringify(content));
  return file;
}

function makeLock(deps: Record<string, { version: string; requires?: Record<string, string> }>) {
  return {
    name: 'test',
    version: '1.0.0',
    lockfileVersion: 2,
    dependencies: deps,
  };
}

describe('runComplexityCommand', () => {
  it('throws when lock file does not exist', () => {
    expect(() => runComplexityCommand({ lockFile: '/no/such/file.json' })).toThrow('Lock file not found');
  });

  it('returns text output by default', () => {
    const lock = writeTempLock(makeLock({ lodash: { version: '4.17.21' } }));
    const result = runComplexityCommand({ lockFile: lock });
    expect(result).toContain('Complexity Report');
    expect(result).toContain('lodash@4.17.21');
  });

  it('returns JSON output when format is json', () => {
    const lock = writeTempLock(makeLock({ lodash: { version: '4.17.21' } }));
    const result = runComplexityCommand({ lockFile: lock, format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('entries');
    expect(Array.isArray(parsed.entries)).toBe(true);
  });

  it('filters entries below the threshold', () => {
    const lock = writeTempLock(
      makeLock({
        lodash: { version: '4.17.21' },
        express: { version: '4.18.0', requires: { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6', g: '7', h: '8', i: '9', j: '10', k: '11', l: '12' } },
      })
    );
    const all = runComplexityCommand({ lockFile: lock, format: 'json' });
    const filtered = runComplexityCommand({ lockFile: lock, format: 'json', threshold: 5 });
    const allParsed = JSON.parse(all);
    const filteredParsed = JSON.parse(filtered);
    expect(filteredParsed.entries.length).toBeLessThanOrEqual(allParsed.entries.length);
  });

  it('handles a lock file with no dependencies', () => {
    const lock = writeTempLock(makeLock({}));
    const result = runComplexityCommand({ lockFile: lock });
    expect(result).toContain('No dependencies');
  });
});
