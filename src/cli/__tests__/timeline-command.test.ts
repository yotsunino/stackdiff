import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runTimelineCommand } from '../timeline-command';

function writeTempLock(dir: string, name: string, content: object): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify(content), 'utf-8');
  return filePath;
}

function makeLock(deps: Record<string, string>) {
  return {
    lockfileVersion: 2,
    packages: Object.fromEntries(
      Object.entries(deps).map(([k, v]) => [
        `node_modules/${k}`,
        { version: v, resolved: '', integrity: '' },
      ])
    ),
  };
}

describe('runTimelineCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prints text report to stdout', async () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', makeLock({ react: '17.0.0' }));
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLock({ react: '18.0.0' }));
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runTimelineCommand({ base, head });
    const output = spy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Dependency Timeline Report');
    expect(output).toContain('UPGRADED');
    spy.mockRestore();
  });

  it('writes json report to file', async () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', makeLock({ lodash: '4.0.0' }));
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLock({ lodash: '4.17.0' }));
    const outFile = path.join(tmpDir, 'out', 'report.json');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runTimelineCommand({ base, head, format: 'json', outputFile: outFile });
    spy.mockRestore();
    const written = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
    expect(written).toHaveProperty('upgradedCount', 1);
  });

  it('throws if base file does not exist', async () => {
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLock({}));
    await expect(
      runTimelineCommand({ base: '/nonexistent/lock.json', head })
    ).rejects.toThrow('Base lock file not found');
  });

  it('warns on downgraded packages', async () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', makeLock({ axios: '2.0.0' }));
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLock({ axios: '1.0.0' }));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await runTimelineCommand({ base, head });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('downgraded'));
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
