import { readFile } from 'fs/promises';
import { join } from 'path';

export interface DependencyNode {
  name: string;
  version: string;
  resolved?: string;
  dependencies?: Record<string, DependencyNode>;
}

export interface DependencyTree {
  name: string;
  version: string;
  lockfileVersion: number;
  dependencies: Record<string, DependencyNode>;
}

export class PackageLockParser {
  /**
   * Parse a package-lock.json file and extract dependency tree
   * @param filePath - Path to package-lock.json file
   * @returns Parsed dependency tree
   */
  async parse(filePath: string): Promise<DependencyTree> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lockfile = JSON.parse(content);

      return this.extractDependencyTree(lockfile);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse package-lock.json: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Extract structured dependency tree from lockfile object
   */
  private extractDependencyTree(lockfile: any): DependencyTree {
    const dependencies: Record<string, DependencyNode> = {};

    // Handle both lockfile v1 and v2/v3 formats
    const deps = lockfile.dependencies || lockfile.packages || {};

    for (const [name, data] of Object.entries(deps)) {
      if (name === '' || !data) continue; // Skip root package in v2/v3

      const depData = data as any;
      dependencies[name] = {
        name: name.replace(/^node_modules\//, ''), // Clean v2/v3 format
        version: depData.version,
        resolved: depData.resolved,
        dependencies: depData.dependencies || {},
      };
    }

    return {
      name: lockfile.name || 'unknown',
      version: lockfile.version || '0.0.0',
      lockfileVersion: lockfile.lockfileVersion || 1,
      dependencies,
    };
  }

  /**
   * Flatten nested dependencies into a single-level map
   */
  flattenDependencies(tree: DependencyTree): Map<string, string[]> {
    const flattened = new Map<string, string[]>();

    const traverse = (deps: Record<string, DependencyNode>) => {
      for (const [name, node] of Object.entries(deps)) {
        const cleanName = name.replace(/^node_modules\//, '');
        const versions = flattened.get(cleanName) || [];
        
        if (!versions.includes(node.version)) {
          versions.push(node.version);
        }
        
        flattened.set(cleanName, versions);

        if (node.dependencies) {
          traverse(node.dependencies);
        }
      }
    };

    traverse(tree.dependencies);
    return flattened;
  }
}
