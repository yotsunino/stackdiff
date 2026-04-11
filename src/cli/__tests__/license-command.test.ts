import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runLicenseCommand } from '../license-command';

function writeTempLock(dir: string, name: string, content: object): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify(content));
  return filePath;
}

function makeLockContent(packages: Record<string, { version: string; license?: string }>) {
  const pkgs: Record<string, object> = {};
  for (const [k, v] of Object.entries(packages)) {
    pkgs[`node_modules/${k}`] = { version: v.version, resolved: '', integrity: '', license: v.license };
  }
  return { lockfileVersion: 3, packages: pkgs };
}

describe('runLicenseCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'license-cmd-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns 0 when no restrictive licenses added', async () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', makeLockContent({ lodash: { version: '4.0.0', license: 'MIT' } }));
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLockContent({ lodash: { version: '4.1.0', license: 'MIT' } }));
    const code = await runLicenseCommand({ base, head });
    expect(code).toBe(0);
  });

  it('returns 1 when base file is missing', async () => {
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLockContent({}));
    const code = await runLicenseCommand({ base: '/nonexistent/lock.json', head });
    expect(code).toBe(1);
  });

  it('returns 1 with failOnRestrictive when GPL package added', async () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', makeLockContent({}));
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLockContent({ 'gpl-lib': { version: '1.0.0', license: 'GPL-3.0' } }));
    const code = await runLicenseCommand({ base, head, failOnRestrictive: true });
    expect(code).toBe(1);
  });

  it('returns 0 with failOnRestrictive when no restrictive licenses', async () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', makeLockContent({ lodash: { version: '4.0.0', license: 'MIT' } }));
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLockContent({ lodash: { version: '4.0.0', license: 'MIT' } }));
    const code = await runLicenseCommand({ base, head, failOnRestrictive: true });
    expect(code).toBe(0);
  });

  it('outputs json when format is json', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const base = writeTempLock(tmpDir, 'base-lock.json', makeLockContent({}));
    const head = writeTempLock(tmpDir, 'head-lock.json', makeLockContent({ axios: { version: '1.0.0', license: 'MIT' } }));
    await runLicenseCommand({ base, head, format: 'json' });
    const output = spy.mock.calls[0][0];
    expect(() => JSON.parse(output)).not.toThrow();
    spy.mockRestore();
  });
});
