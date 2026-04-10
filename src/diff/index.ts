export { diffDependencies, isMajorVersionChange } from './dependency-differ';
export { diffTransitive, formatTransitiveSummary } from './transitive-diff';
export { diffDirect, classifyChange, formatDirectSummary } from './direct-diff';
export { diffChangeSets, formatChangeSetSummary } from './change-set-diff';
export { buildDiffSummary, formatSummaryText, formatSummaryJson } from './summary-builder';
export { buildPatchSummary, formatPatchSummaryText } from './patch-summary';
export type { PatchSummary } from './patch-summary';
