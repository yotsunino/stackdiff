export { isMajorVersionChange, diffDependencies } from './dependency-differ';
export { diffTransitive, formatTransitiveSummary } from './transitive-diff';
export { classifyChange, diffDirect, formatDirectSummary } from './direct-diff';
export { diffChangeSets, formatChangeSetSummary } from './change-set-diff';
export { buildDiffSummary, formatSummaryText, formatSummaryJson } from './summary-builder';
export { buildPatchSummary, classifyVersionChange, formatPatchSummaryText } from './patch-summary';
export { buildUpgradePath, buildUpgradePaths, formatUpgradePathText } from './upgrade-path';
export type { UpgradePath, UpgradePathSummary } from './upgrade-path';
