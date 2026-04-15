import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runVolatilityCommand, meetsVolatilityThreshold } from '../volatility-command';

function writeTempLock(dir: string, name: string, content: object): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify(content));
  return filePath;
}

function makeLock(deps: Record<string, { version: string }>) {
  return {
    lockfileVersion: 2,
    packages: Object.fromEntries(
      Object.entries(deps).map(([k, v]) => [`node_modules/${k}`, { version: v.version }])
    ),
  };
}

describe('meetsVolatilityThreshold', () => {
  it('stable meets stable threshold', () => {
    expect(meetsVolatilityThreshold('stable', 'stable')).toBe(true);
  });

  it('volatile does not meet highly-volatile threshold', () => {
    expect(meetsVolatilityThreshold('volatile', 'highly-volatile')).toBe(false);
  });

  it('highly-volatile meets volatile threshold', () => {
    expect(meetsVolatilityThreshold('highly-volatile', 'volatile')).toBe(true);
  });
});

describe('runVolatilityCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-vol-'));
    process.exitCode = 0;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it('runs without error for identical lock files', async () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const base = writeTempLock(tmpDir, 'base.json', lock);
    const head = writeTempLock(tmpDir, 'head.json', lock);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await expect(runVolatilityCommand({ base, head })).resolves.not.toThrow();
    spy.mockRestore();
  });

  it('throws when base file is missing', async () => {
    const head = writeTempLock(tmpDir, 'head.json', makeLock({}));
    await expect(
      runVolatilityCommand({ base: '/nonexistent/lock.json', head })
    ).rejects.toThrow('Base lock file not found');
  });

  it('outputs json when format is json', async () => {
    const lock = makeLock({ react: { version: '18.2.0' } });
    const base = writeTempLock(tmpDir, 'base.json', makeLock({ react: { version: '16.0.0' } }));
    const head = writeTempLock(tmpDir, 'head.json', lock);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runVolatilityCommand({ base, head, format: 'json' });
    const output = spy.mock.calls[0][0];
    expect(() => JSON.parse(output)).not.toThrow();
    spy.mockRestore();
  });
});
