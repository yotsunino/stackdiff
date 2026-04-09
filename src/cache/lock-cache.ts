import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { DependencyMap } from '../parser';

export interface CacheEntry {
  hash: string;
  timestamp: number;
  dependencies: DependencyMap;
}

const DEFAULT_CACHE_DIR = '.stackdiff-cache';

export function hashFileContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function getCachePath(cacheDir: string, key: string): string {
  return path.join(cacheDir, `${key}.json`);
}

export function readCache(cacheDir: string, key: string): CacheEntry | null {
  const filePath = getCachePath(cacheDir, key);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

export function writeCache(
  cacheDir: string,
  key: string,
  entry: CacheEntry
): void {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const filePath = getCachePath(cacheDir, key);
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
}

export function getOrParse(
  lockContent: string,
  parser: (content: string) => DependencyMap,
  cacheDir: string = DEFAULT_CACHE_DIR
): DependencyMap {
  const hash = hashFileContent(lockContent);
  const cached = readCache(cacheDir, hash);
  if (cached && cached.hash === hash) {
    return cached.dependencies;
  }
  const dependencies = parser(lockContent);
  writeCache(cacheDir, hash, { hash, timestamp: Date.now(), dependencies });
  return dependencies;
}

export function clearCache(cacheDir: string = DEFAULT_CACHE_DIR): number {
  if (!fs.existsSync(cacheDir)) return 0;
  const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    fs.unlinkSync(path.join(cacheDir, file));
  }
  return files.length;
}
