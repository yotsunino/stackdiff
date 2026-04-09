import {
  checkPeerDependencies,
  getBreakingPeerIssues,
  PeerDepMap,
  ResolvedDepMap,
} from '../peer-dependency-checker';

describe('checkPeerDependencies', () => {
  const peerDeps: PeerDepMap = {
    'some-plugin': {
      react: '>=16.0.0 <18.0.0',
      'react-dom': '>=16.0.0 <18.0.0',
    },
    'another-lib': {
      lodash: '^4.0.0',
    },
  };

  it('returns no issues when all peers satisfy their ranges', () => {
    const resolved: ResolvedDepMap = {
      react: '17.0.2',
      'react-dom': '17.0.2',
      lodash: '4.17.21',
    };
    const issues = checkPeerDependencies(peerDeps, resolved);
    expect(issues).toHaveLength(0);
  });

  it('flags a missing peer dep as breaking', () => {
    const resolved: ResolvedDepMap = {
      react: '17.0.2',
      // react-dom missing
      lodash: '4.17.21',
    };
    const issues = checkPeerDependencies(peerDeps, resolved);
    const missing = issues.find(
      (i) => i.peerDep === 'react-dom' && i.resolvedVersion === 'MISSING'
    );
    expect(missing).toBeDefined();
    expect(missing?.breaking).toBe(true);
  });

  it('flags an out-of-range peer dep', () => {
    const resolved: ResolvedDepMap = {
      react: '18.2.0', // outside <18.0.0
      'react-dom': '17.0.2',
      lodash: '4.17.21',
    };
    const issues = checkPeerDependencies(peerDeps, resolved);
    const reactIssue = issues.find(
      (i) => i.package === 'some-plugin' && i.peerDep === 'react'
    );
    expect(reactIssue).toBeDefined();
    expect(reactIssue?.resolvedVersion).toBe('18.2.0');
  });

  it('does not flag compatible minor upgrade', () => {
    const resolved: ResolvedDepMap = {
      react: '17.0.2',
      'react-dom': '17.0.2',
      lodash: '4.20.0',
    };
    const issues = checkPeerDependencies(peerDeps, resolved);
    expect(issues.find((i) => i.peerDep === 'lodash')).toBeUndefined();
  });
});

describe('getBreakingPeerIssues', () => {
  it('filters to only breaking issues', () => {
    const issues = [
      { package: 'a', peerDep: 'b', requiredRange: '^1.0.0', resolvedVersion: '2.0.0', breaking: true },
      { package: 'a', peerDep: 'c', requiredRange: '^1.0.0', resolvedVersion: '1.5.0', breaking: false },
    ];
    const breaking = getBreakingPeerIssues(issues);
    expect(breaking).toHaveLength(1);
    expect(breaking[0].peerDep).toBe('b');
  });
});
