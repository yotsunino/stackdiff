import { describe, it, expect, beforeEach } from '@jest/globals';
import { PackageLockParser } from '../package-lock-parser';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = join(__dirname, '.tmp-test');

describe('PackageLockParser', () => {
  let parser: PackageLockParser;

  beforeEach(async () => {
    parser = new PackageLockParser();
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should parse a valid package-lock.json v1 format', async () => {
    const lockfileContent = {
      name: 'test-project',
      version: '1.0.0',
      lockfileVersion: 1,
      dependencies: {
        'lodash': {
          version: '4.17.21',
          resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
        },
        'axios': {
          version: '1.4.0',
          resolved: 'https://registry.npmjs.org/axios/-/axios-1.4.0.tgz',
        },
      },
    };

    const testFile = join(TEST_DIR, 'package-lock.json');
    await writeFile(testFile, JSON.stringify(lockfileContent, null, 2));

    const result = await parser.parse(testFile);

    expect(result.name).toBe('test-project');
    expect(result.version).toBe('1.0.0');
    expect(result.lockfileVersion).toBe(1);
    expect(result.dependencies['lodash'].version).toBe('4.17.21');
    expect(result.dependencies['axios'].version).toBe('1.4.0');
  });

  it('should throw error for invalid JSON', async () => {
    const testFile = join(TEST_DIR, 'invalid.json');
    await writeFile(testFile, 'invalid json content');

    await expect(parser.parse(testFile)).rejects.toThrow(
      'Failed to parse package-lock.json'
    );
  });

  it('should flatten nested dependencies', async () => {
    const tree = {
      name: 'test',
      version: '1.0.0',
      lockfileVersion: 1,
      dependencies: {
        'pkg-a': {
          name: 'pkg-a',
          version: '1.0.0',
          dependencies: {
            'pkg-b': {
              name: 'pkg-b',
              version: '2.0.0',
            },
          },
        },
        'pkg-b': {
          name: 'pkg-b',
          version: '1.5.0',
        },
      },
    };

    const flattened = parser.flattenDependencies(tree);

    expect(flattened.get('pkg-a')).toEqual(['1.0.0']);
    expect(flattened.get('pkg-b')).toEqual(['1.5.0', '2.0.0']);
  });
});
