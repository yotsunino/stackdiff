import {
  calculateScore,
  gradeScore,
  formatScoreText,
  ScoredDiff,
} from '../score-calculator';
import { DependencyEntry } from '../../resolver/index';

function makeEntry(name: string, version: string): DependencyEntry {
  return { name, version, resolved: '', integrity: '' };
}

describe('gradeScore', () => {
  it('returns A for 90+', () => expect(gradeScore(95)).toBe('A'));
  it('returns B for 75-89', () => expect(gradeScore(80)).toBe('B'));
  it('returns C for 60-74', () => expect(gradeScore(65)).toBe('C'));
  it('returns D for 45-59', () => expect(gradeScore(50)).toBe('D'));
  it('returns F for below 45', () => expect(gradeScore(30)).toBe('F'));
  it('returns A for exactly 100', () => expect(gradeScore(100)).toBe('A'));
});

describe('calculateScore', () => {
  it('returns perfect score when no changes', () => {
    const result = calculateScore([], [], [], [], [], []);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.breakdown.deductions).toHaveLength(0);
  });

  it('deducts for added packages', () => {
    const result = calculateScore([makeEntry('lodash', '4.0.0')], [], [], [], [], []);
    expect(result.score).toBe(98);
  });

  it('deducts for removed packages', () => {
    const result = calculateScore([], [makeEntry('lodash', '4.0.0')], [], [], [], []);
    expect(result.score).toBe(92);
  });

  it('deducts heavily for major downgrade', () => {
    const result = calculateScore([], [], [], [makeEntry('react', '16.0.0')], [], []);
    expect(result.score).toBe(85);
  });

  it('deducts for major upgrade', () => {
    const result = calculateScore([], [], [makeEntry('react', '18.0.0')], [], [], []);
    expect(result.score).toBe(90);
  });

  it('clamps score to 0 with many issues', () => {
    const many = Array.from({ length: 20 }, (_, i) => makeEntry(`pkg${i}`, '1.0.0'));
    const result = calculateScore(many, many, many, many, many, many);
    expect(result.score).toBe(0);
  });

  it('accumulates multiple deduction reasons', () => {
    const result = calculateScore(
      [makeEntry('a', '1.0.0')],
      [makeEntry('b', '2.0.0')],
      [],
      [],
      [],
      []
    );
    expect(result.breakdown.deductions).toHaveLength(2);
  });
});

describe('formatScoreText', () => {
  it('shows clean diff message when no deductions', () => {
    const result = calculateScore([], [], [], [], [], []);
    const text = formatScoreText(result);
    expect(text).toContain('100/100');
    expect(text).toContain('clean diff');
  });

  it('lists deductions', () => {
    const result = calculateScore([makeEntry('x', '1.0.0')], [], [], [], [], []);
    const text = formatScoreText(result);
    expect(text).toContain('-2');
    expect(text).toContain('added');
  });
});
