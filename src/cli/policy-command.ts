import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { checkAgainstPolicy, formatPolicyReportText, PolicyRule } from '../diff/security-policy';

export type PolicyCommandOptions = {
  lockFile: string;
  policyFile: string;
  json?: boolean;
};

function loadPolicyRules(policyFile: string): PolicyRule[] {
  const abs = path.resolve(policyFile);
  if (!fs.existsSync(abs)) {
    throw new Error(`Policy file not found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Policy file must export a JSON array of rules.');
  }
  return parsed as PolicyRule[];
}

export async function runPolicyCommand(opts: PolicyCommandOptions): Promise<number> {
  const lockContent = fs.readFileSync(path.resolve(opts.lockFile), 'utf-8');
  const deps = parsePackageLock(lockContent);
  const rules = loadPolicyRules(opts.policyFile);

  const report = checkAgainstPolicy(deps, rules);

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(formatPolicyReportText(report));
  }

  return report.violations.length > 0 ? 1 : 0;
}

export const policyCommandDescription =
  'Check installed packages against a security/version policy file (JSON array of rules).';
