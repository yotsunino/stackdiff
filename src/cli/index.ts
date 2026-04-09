#!/usr/bin/env node
import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { diffDependencies } from '../diff/dependency-differ';
import { formatReport } from '../reporter/conflict-reporter';

program
  .name('stackdiff')
  .description('Compare dependency trees across branches and surface breaking version conflicts')
  .version('0.1.0');

program
  .command('compare')
  .description('Compare two package-lock.json files and report conflicts')
  .requiredOption('-b, --base <path>', 'Path to the base branch package-lock.json')
  .requiredOption('-h, --head <path>', 'Path to the head branch package-lock.json')
  .option('--json', 'Output results as JSON')
  .option('--fail-on-major', 'Exit with code 1 if major version conflicts are found')
  .action((options) => {
    const basePath = path.resolve(options.base);
    const headPath = path.resolve(options.head);

    if (!fs.existsSync(basePath)) {
      console.error(`Error: Base file not found: ${basePath}`);
      process.exit(1);
    }

    if (!fs.existsSync(headPath)) {
      console.error(`Error: Head file not found: ${headPath}`);
      process.exit(1);
    }

    try {
      const baseContent = fs.readFileSync(basePath, 'utf-8');
      const headContent = fs.readFileSync(headPath, 'utf-8');

      const baseDeps = parsePackageLock(baseContent);
      const headDeps = parsePackageLock(headContent);

      const report = diffDependencies(baseDeps, headDeps);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatReport(report));
      }

      if (options.failOnMajor && report.conflicts.some((c) => c.isMajor)) {
        process.exit(1);
      }
    } catch (err) {
      console.error('Error parsing package-lock files:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse(process.argv);
