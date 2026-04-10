import {
  buildUpgradePath,
  buildUpgradePaths,
  formatUpgradePathText,
} from '../upgrade-path';

describe('buildUpgradePath', () => {
  it('classifies a major bump as breaking', () => {
    const result = buildUpgradePath('react', '17.0.0', '18.0.0');
    expect(result.label).toBe('major');
    expect(result.breaking).toBe(true);
  });

  it('classifies a minor bump as safe', () => {
    const result = buildUpgradePath('lodash', '4.17.0', '4.18.0');
    expect(result.label).toBe('minor');
    expect(result.breaking).toBe(false);
  });

  it('classifies a patch bump as safe', () => {
    const result = buildUpgradePath('axios', '1.2.3', '1.2.4');
    expect(result.label).toBe('patch');
    expect(result.breaking).toBe(false);
  });

  it('preserves name, from, and to fields', () => {
    const result = buildUpgradePath('express', '4.0.0', '5.0.0');
    expect(result.name).toBe('express');
    expect(result.from).toBe('4.0.0');
    expect(result.to).toBe('5.0.0');
  });
});

describe('buildUpgradePaths', () => {
  it('counts breaking and safe upgrades', () => {
    const summary = buildUpgradePaths([
      { name: 'react', from: '17.0.0', to: '18.0.0' },
      { name: 'lodash', from: '4.17.0', to: '4.18.0' },
      { name: 'axios', from: '1.2.3', to: '1.2.4' },
    ]);
    expect(summary.breakingCount).toBe(1);
    expect(summary.safeCount).toBe(2);
    expect(summary.paths).toHaveLength(3);
  });

  it('returns empty summary for no changes', () => {
    const summary = buildUpgradePaths([]);
    expect(summary.paths).toHaveLength(0);
    expect(summary.breakingCount).toBe(0);
    expect(summary.safeCount).toBe(0);
  });
});

describe('formatUpgradePathText', () => {
  it('returns a no-upgrade message for empty paths', () => {
    const text = formatUpgradePathText({ paths: [], breakingCount: 0, safeCount: 0 });
    expect(text).toBe('No upgrades detected.');
  });

  it('includes breaking tag for major changes', () => {
    const summary = buildUpgradePaths([
      { name: 'react', from: '17.0.0', to: '18.0.0' },
    ]);
    const text = formatUpgradePathText(summary);
    expect(text).toContain('[BREAKING]');
    expect(text).toContain('react');
    expect(text).toContain('17.0.0 → 18.0.0');
  });

  it('includes safe tag for non-breaking changes', () => {
    const summary = buildUpgradePaths([
      { name: 'lodash', from: '4.17.0', to: '4.18.0' },
    ]);
    const text = formatUpgradePathText(summary);
    expect(text).toContain('[safe]');
    expect(text).toContain('lodash');
  });

  it('includes header with counts', () => {
    const summary = buildUpgradePaths([
      { name: 'react', from: '17.0.0', to: '18.0.0' },
      { name: 'lodash', from: '4.17.0', to: '4.18.0' },
    ]);
    const text = formatUpgradePathText(summary);
    expect(text).toContain('1 breaking');
    expect(text).toContain('1 safe');
  });
});
