import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  hashFileContent,
  readCache,
  writeCache,
  getOrParse,
  clearCache,
  CacheEntry,
} from '../lock-cache';
import { DependencyMap } from '../../parser';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stackdiff-cache-test-'));
}

const sampleDeps: DependencyMap = new Map([
  ['lodash', { name: 'lodash', version: '4.17.21', resolved: '' }],
]);

describe('hashFileContent', () => {
  it('returns a 16-char hex string', () => {
    const hash = hashFileContent('hello world');
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('produces the same hash for the same content', () => {
    expect(hashFileContent('abc')).toBe(hashFileContent('abc'));
  });

  it('produces different hashes for different content', () => {
    expect(hashFileContent('abc')).not.toBe(hashFileContent('xyz'));
  });
});

describe('readCache / writeCache', () => {
  it('returns null when cache file does not exist', () => {
    const dir = makeTempDir();
    expect(readCache(dir, 'nonexistent')).toBeNull();
  });

  it('writes and reads back a cache entry', () => {
    const dir = makeTempDir();
    const entry: CacheEntry = {
      hash: 'abc123',
      timestamp: 1000,
      dependencies: sampleDeps,
    };
    writeCache(dir, 'abc123', entry);
    const result = readCache(dir, 'abc123');
    expect(result).not.toBeNull();
    expect(result!.hash).toBe('abc123');
    expect(result!.dependencies).toEqual(sampleDeps);
  });
});

describe('getOrParse', () => {
  it('calls parser on first access and caches result', () => {
    const dir = makeTempDir();
    const parser = jest.fn().mockReturnValue(sampleDeps);
    const content = '{"lockfileVersion":2}';
    const result = getOrParse(content, parser, dir);
    expect(parser).toHaveBeenCalledTimes(1);
    expect(result).toEqual(sampleDeps);
  });

  it('returns cached result without calling parser again', () => {
    const dir = makeTempDir();
    const parser = jest.fn().mockReturnValue(sampleDeps);
    const content = 'same content';
    getOrParse(content, parser, dir);
    getOrParse(content, parser, dir);
    expect(parser).toHaveBeenCalledTimes(1);
  });
});

describe('clearCache', () => {
  it('returns 0 when cache dir does not exist', () => {
    expect(clearCache('/tmp/no-such-dir-stackdiff')).toBe(0);
  });

  it('deletes all json files and returns count', () => {
    const dir = makeTempDir();
    const entry: CacheEntry = { hash: 'h1', timestamp: 0, dependencies: sampleDeps };
    writeCache(dir, 'h1', entry);
    writeCache(dir, 'h2', { ...entry, hash: 'h2' });
    const count = clearCache(dir);
    expect(count).toBe(2);
    expect(fs.readdirSync(dir)).toHaveLength(0);
  });
});
