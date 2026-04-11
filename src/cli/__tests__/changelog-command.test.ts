import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runChangelogCommand } from '../changelog-command';

function writeTempLock(deps: Record<string, string>): string {
  const packages: Record<string, object> = { '': { requires: true, lockfileVersion: 2 } };
  for (const [name, version] of Object.entries(deps)) {
    packages[`node_modules/${name}`] = { version, resolved: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz` };
  }
  const content = JSON.stringify({ lockfileVersion: 2, packages }, null, 2);
  const tmpFile = path.join(os.tmpdir(), `lock-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmpFile, content, 'utf-8');
  return tmpFile;
}

describe('runChangelogCommand', () => {
  let writeSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    writeSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('outputs text changelog to stdout', async () => {
    const base = writeTempLock({ lodash: '4.17.20' });
    const head = writeTempLock({ lodash: '4.17.21', axios: '1.0.0' });
    await runChangelogCommand({ base, head });
    const output = writeSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(output).toContain('↑ Upgraded');
    expect(output).toContain('+ Added');
    expect(output).toContain('lodash');
    expect(output).toContain('axios');
  });

  it('outputs json changelog to stdout', async () => {
    const base = writeTempLock({ react: '17.0.0' });
    const head = writeTempLock({ react: '18.0.0' });
    await runChangelogCommand({ base, head, format: 'json' });
    const output = writeSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
    const parsed = JSON.parse(output);
    expect(parsed.upgraded).toBe(1);
    expect(parsed.entries[0].name).toBe('react');
  });

  it('writes output to file when --output is specified', async () => {
    const base = writeTempLock({ express: '4.17.0' });
    const head = writeTempLock({});
    const outFile = path.join(os.tmpdir(), `changelog-out-${Math.random().toString(36).slice(2)}.txt`);
    await runChangelogCommand({ base, head, output: outFile });
    expect(fs.existsSync(outFile)).toBe(true);
    const content = fs.readFileSync(outFile, 'utf-8');
    expect(content).toContain('express');
    fs.unlinkSync(outFile);
  });

  it('shows no-change message when deps are identical', async () => {
    const lock = writeTempLock({ lodash: '4.17.21' });
    await runChangelogCommand({ base: lock, head: lock });
    const output = writeSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(output).toContain('No dependency changes');
  });
});
