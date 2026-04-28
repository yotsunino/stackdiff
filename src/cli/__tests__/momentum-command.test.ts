import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runMomentumCommand } from '../momentum-command';

function writeTempLock(dir: string, name: string, content: object): string {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(content));
  return p;
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

describe('runMomentumCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'momentum-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prints fallback when no changes', () => {
    const lock = makeLock({ lodash: '4.17.21' });
    const base = writeTempLock(tmpDir, 'base.json', lock);
    const head = writeTempLock(tmpDir, 'head.json', lock);
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    runMomentumCommand({ base, head });
    expect(spy.mock.calls.join('')).toContain('No momentum data');
    spy.mockRestore();
  });

  it('reports changed packages in text mode', () => {
    const base = writeTempLock(tmpDir, 'base.json', makeLock({ react: '17.0.0' }));
    const head = writeTempLock(tmpDir, 'head.json', makeLock({ react: '18.0.0' }));
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    runMomentumCommand({ base, head });
    const out = spy.mock.calls.join('');
    expect(out).toContain('react');
    expect(out).toContain('17.0.0');
    spy.mockRestore();
  });

  it('outputs valid JSON in json format', () => {
    const base = writeTempLock(tmpDir, 'base.json', makeLock({ axios: '0.21.0' }));
    const head = writeTempLock(tmpDir, 'head.json', makeLock({ axios: '1.0.0' }));
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    runMomentumCommand({ base, head, format: 'json' });
    const out = spy.mock.calls[0][0];
    const parsed = JSON.parse(out);
    expect(parsed).toHaveProperty('entries');
    expect(parsed).toHaveProperty('averageScore');
    spy.mockRestore();
  });

  it('exits with error when base file is missing', () => {
    const head = writeTempLock(tmpDir, 'head.json', makeLock({}));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => runMomentumCommand({ base: '/nonexistent/lock.json', head })).toThrow('exit');
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});
