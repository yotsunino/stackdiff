import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runDuplicateCommand } from '../duplicate-command';

function writeTempLock(content: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-dup-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, JSON.stringify(content), 'utf-8');
  return file;
}

const cleanLock = {
  lockfileVersion: 2,
  packages: {
    'node_modules/react': { version: '18.0.0' },
    'node_modules/lodash': { version: '4.17.21' },
  },
};

const dupLock = {
  lockfileVersion: 2,
  packages: {
    'node_modules/lodash': { version: '4.17.21' },
    'node_modules/some-lib/node_modules/lodash': { version: '3.10.0' },
  },
};

describe('runDuplicateCommand', () => {
  it('throws when lock file does not exist', async () => {
    await expect(
      runDuplicateCommand({ lockFile: '/no/such/file.json', format: 'text' })
    ).rejects.toThrow('Lock file not found');
  });

  it('returns clean message for lock with no duplicates', async () => {
    const lockFile = writeTempLock(cleanLock);
    const result = await runDuplicateCommand({ lockFile, format: 'text' });
    expect(result).toContain('No duplicate packages detected');
  });

  it('reports duplicates in text format', async () => {
    const lockFile = writeTempLock(dupLock);
    const result = await runDuplicateCommand({ lockFile, format: 'text' });
    expect(result).toContain('lodash');
  });

  it('reports duplicates in json format', async () => {
    const lockFile = writeTempLock(dupLock);
    const result = await runDuplicateCommand({ lockFile, format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('report');
    expect(parsed.report.affectedPackages).toBeGreaterThanOrEqual(1);
  });

  it('returns ok message when within threshold', async () => {
    const lockFile = writeTempLock(dupLock);
    const result = await runDuplicateCommand({ lockFile, format: 'text', threshold: 10 });
    expect(result).toContain('within threshold');
  });
});
