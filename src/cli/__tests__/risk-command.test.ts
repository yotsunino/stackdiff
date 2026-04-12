import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { filterByRiskThreshold, runRiskCommand } from '../risk-command';
import { RiskEntry } from '../../diff/dependency-risk';

function writeTempLock(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-risk-'));
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, content);
  return file;
}

function makeLock(packages: Record<string, string>): string {
  const pkgs: Record<string, unknown> = {};
  for (const [name, version] of Object.entries(packages)) {
    pkgs[`node_modules/${name}`] = { version, resolved: '', integrity: '' };
  }
  return JSON.stringify({ lockfileVersion: 2, packages: pkgs });
}

function makeEntry(name: string, version: string, riskLevel: RiskEntry['riskLevel'], score: number): RiskEntry {
  return { name, version, riskLevel, reasons: [], score };
}

describe('filterByRiskThreshold', () => {
  const entries: RiskEntry[] = [
    makeEntry('a', '0.1.0', 'critical', 65),
    makeEntry('b', '0.2.0-beta', 'high', 45),
    makeEntry('c', '1.0.0-rc.1', 'medium', 25),
    makeEntry('d', '2.0.0-alpha', 'low', 10),
  ];

  it('filters to critical only', () => {
    const result = filterByRiskThreshold(entries, 'critical');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('a');
  });

  it('filters to high and above', () => {
    const result = filterByRiskThreshold(entries, 'high');
    expect(result).toHaveLength(2);
  });

  it('includes all entries at low threshold', () => {
    const result = filterByRiskThreshold(entries, 'low');
    expect(result).toHaveLength(4);
  });
});

describe('runRiskCommand', () => {
  it('prints no-issue message for stable lock file', async () => {
    const lock = makeLock({ lodash: '4.17.21', express: '4.18.2' });
    const file = writeTempLock(lock);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runRiskCommand({ lockFile: file, threshold: 'low', format: 'text' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No dependency risk issues detected'));
    spy.mockRestore();
  });

  it('exits with error for missing lock file', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(runRiskCommand({ lockFile: '/nonexistent/path.json' })).rejects.toThrow('exit');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    spy.mockRestore();
    exit.mockRestore();
  });

  it('writes output to file when --output is specified', async () => {
    const lock = makeLock({ lodash: '4.17.21' });
    const file = writeTempLock(lock);
    const outFile = file.replace('package-lock.json', 'risk-report.txt');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runRiskCommand({ lockFile: file, format: 'text', output: outFile });
    expect(fs.existsSync(outFile)).toBe(true);
    spy.mockRestore();
  });
});
