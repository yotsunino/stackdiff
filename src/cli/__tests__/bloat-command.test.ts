import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runBloatCommand } from '../bloat-command';

function writeTempLock(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-bloat-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

const simpleLock = JSON.stringify({
  lockfileVersion: 2,
  dependencies: {
    express: {
      version: '4.18.2',
      resolved: 'https://registry.npmjs.org/express/-/express-4.18.2.tgz',
      requires: { 'body-parser': '1.20.1' },
    },
    'body-parser': {
      version: '1.20.1',
      resolved: 'https://registry.npmjs.org/body-parser/-/body-parser-1.20.1.tgz',
    },
  },
});

describe('runBloatCommand', () => {
  it('returns text output by default', async () => {
    const lockFile = writeTempLock(simpleLock);
    const output = await runBloatCommand({ lockFile });
    expect(output).toContain('Bloat');
  });

  it('returns json output when json flag is set', async () => {
    const lockFile = writeTempLock(simpleLock);
    const output = await runBloatCommand({ lockFile, json: true });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('entries');
    expect(parsed).toHaveProperty('heaviest');
  });

  it('respects topN limit', async () => {
    const lockFile = writeTempLock(simpleLock);
    const output = await runBloatCommand({ lockFile, topN: 1, json: true });
    const parsed = JSON.parse(output);
    expect(parsed.entries.length).toBeLessThanOrEqual(1);
  });

  it('throws if lock file does not exist', async () => {
    await expect(
      runBloatCommand({ lockFile: '/nonexistent/package-lock.json' })
    ).rejects.toThrow('Lock file not found');
  });
});
