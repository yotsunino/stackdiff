import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runImpactCommand } from '../impact-command';

function writeTempLock(dir: string, name: string, content: object): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify(content));
  return filePath;
}

function makeLock(deps: Record<string, { version: string; requires?: Record<string, string> }>) {
  return {
    lockfileVersion: 2,
    packages: Object.fromEntries(
      Object.entries(deps).map(([k, v]) => [`node_modules/${k}`, v])
    ),
  };
}

describe('runImpactCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-impact-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns no-change message when versions are identical', async () => {
    const lock = makeLock({ lodash: { version: '4.0.0' } });
    const base = writeTempLock(tmpDir, 'base.json', lock);
    const head = writeTempLock(tmpDir, 'head.json', lock);
    const result = await runImpactCommand({ base, head });
    expect(result).toContain('No impactful');
  });

  it('detects version changes and reports impact', async () => {
    const base = writeTempLock(tmpDir, 'base.json', makeLock({ lodash: { version: '3.0.0' } }));
    const head = writeTempLock(
      tmpDir,
      'head.json',
      makeLock({
        lodash: { version: '4.0.0' },
        express: { version: '4.18.0', requires: { lodash: '^4.0.0' } },
      })
    );
    const result = await runImpactCommand({ base, head });
    expect(result).toContain('lodash');
    expect(result).toContain('3.0.0');
    expect(result).toContain('4.0.0');
  });

  it('outputs json when format is json', async () => {
    const base = writeTempLock(tmpDir, 'base.json', makeLock({ react: { version: '17.0.0' } }));
    const head = writeTempLock(tmpDir, 'head.json', makeLock({ react: { version: '18.0.0' } }));
    const result = await runImpactCommand({ base, head, format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('entries');
  });

  it('filters by minScore', async () => {
    const base = writeTempLock(tmpDir, 'base.json', makeLock({ tiny: { version: '1.0.0' } }));
    const head = writeTempLock(tmpDir, 'head.json', makeLock({ tiny: { version: '1.0.1' } }));
    const result = await runImpactCommand({ base, head, minScore: 10 });
    expect(result).toContain('No impactful');
  });

  it('throws when base file does not exist', async () => {
    const head = writeTempLock(tmpDir, 'head.json', makeLock({}));
    await expect(runImpactCommand({ base: '/nonexistent.json', head })).rejects.toThrow('Base lock file not found');
  });
});
