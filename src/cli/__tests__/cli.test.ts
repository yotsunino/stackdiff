import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CLI_PATH = path.resolve(__dirname, '../../cli/index.ts');
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

function writeTempLock(dir: string, name: string, content: object): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify(content));
  return filePath;
}

const baseLock = {
  lockfileVersion: 2,
  packages: {
    'node_modules/lodash': { version: '4.17.21' },
    'node_modules/express': { version: '4.18.0' },
  },
};

const headLockMinor = {
  lockfileVersion: 2,
  packages: {
    'node_modules/lodash': { version: '4.18.0' },
    'node_modules/express': { version: '4.18.0' },
  },
};

const headLockMajor = {
  lockfileVersion: 2,
  packages: {
    'node_modules/lodash': { version: '5.0.0' },
    'node_modules/express': { version: '4.18.0' },
  },
};

describe('CLI compare command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 0 when no major conflicts exist', () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', baseLock);
    const head = writeTempLock(tmpDir, 'head-lock.json', headLockMinor);
    expect(() =>
      execSync(`ts-node ${CLI_PATH} compare -b ${base} -h ${head}`)
    ).not.toThrow();
  });

  it('outputs JSON when --json flag is passed', () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', baseLock);
    const head = writeTempLock(tmpDir, 'head-lock.json', headLockMinor);
    const output = execSync(
      `ts-node ${CLI_PATH} compare -b ${base} -h ${head} --json`
    ).toString();
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('conflicts');
  });

  it('exits with code 1 when --fail-on-major is set and major conflict exists', () => {
    const base = writeTempLock(tmpDir, 'base-lock.json', baseLock);
    const head = writeTempLock(tmpDir, 'head-lock.json', headLockMajor);
    expect(() =>
      execSync(
        `ts-node ${CLI_PATH} compare -b ${base} -h ${head} --fail-on-major`
      )
    ).toThrow();
  });

  it('exits with code 1 when base file does not exist', () => {
    const head = writeTempLock(tmpDir, 'head-lock.json', headLockMinor);
    expect(() =>
      execSync(`ts-node ${CLI_PATH} compare -b /nonexistent.json -h ${head}`)
    ).toThrow();
  });
});
