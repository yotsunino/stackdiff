import { SeverityLevel } from '../filter/severity-filter';

const VALID_LEVELS: SeverityLevel[] = ['patch', 'minor', 'major', 'all'];

export function parseSeverityOption(raw: string | undefined): SeverityLevel {
  if (!raw) return 'all';
  const normalized = raw.toLowerCase() as SeverityLevel;
  if (!VALID_LEVELS.includes(normalized)) {
    throw new Error(
      `Invalid severity level "${raw}". Must be one of: ${VALID_LEVELS.join(', ')}.`
    );
  }
  return normalized;
}

export function severityOptionDescription(): string {
  return `Minimum change severity to report. One of: ${VALID_LEVELS.join(', ')} (default: all)`;
}
