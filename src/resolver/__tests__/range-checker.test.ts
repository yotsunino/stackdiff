import { parseRange, satisfiesRange } from '../range-checker';

describe('parseRange', () => {
  it('parses caret range', () => {
    expect(parseRange('^1.2.3')).toEqual({ operator: '^', major: 1, minor: 2, patch: 3 });
  });

  it('parses tilde range', () => {
    expect(parseRange('~0.4.1')).toEqual({ operator: '~', major: 0, minor: 4, patch: 1 });
  });

  it('parses gte range', () => {
    expect(parseRange('>=2.0.0')).toEqual({ operator: '>=', major: 2, minor: 0, patch: 0 });
  });

  it('defaults to = when no operator', () => {
    expect(parseRange('3.1.4')).toEqual({ operator: '=', major: 3, minor: 1, patch: 4 });
  });

  it('returns null for invalid range', () => {
    expect(parseRange('not-a-version')).toBeNull();
  });
});

describe('satisfiesRange', () => {
  describe('caret (^)', () => {
    it('returns true when same major and higher minor', () => {
      expect(satisfiesRange('1.3.0', '^1.2.0')).toBe(true);
    });

    it('returns true for exact match', () => {
      expect(satisfiesRange('1.2.0', '^1.2.0')).toBe(true);
    });

    it('returns false when major differs', () => {
      expect(satisfiesRange('2.0.0', '^1.2.0')).toBe(false);
    });

    it('returns false when version is lower', () => {
      expect(satisfiesRange('1.1.9', '^1.2.0')).toBe(false);
    });
  });

  describe('tilde (~)', () => {
    it('returns true for same major+minor with higher patch', () => {
      expect(satisfiesRange('1.2.5', '~1.2.3')).toBe(true);
    });

    it('returns false when minor differs', () => {
      expect(satisfiesRange('1.3.0', '~1.2.3')).toBe(false);
    });
  });

  describe('comparison operators', () => {
    it('>= returns true for equal', () => {
      expect(satisfiesRange('2.0.0', '>=2.0.0')).toBe(true);
    });

    it('>= returns false for lower', () => {
      expect(satisfiesRange('1.9.9', '>=2.0.0')).toBe(false);
    });

    it('> returns false for equal', () => {
      expect(satisfiesRange('2.0.0', '>2.0.0')).toBe(false);
    });

    it('< returns true for lower', () => {
      expect(satisfiesRange('1.0.0', '<2.0.0')).toBe(true);
    });

    it('= returns true for exact match', () => {
      expect(satisfiesRange('3.1.4', '3.1.4')).toBe(true);
    });

    it('= returns false for mismatch', () => {
      expect(satisfiesRange('3.1.5', '3.1.4')).toBe(false);
    });
  });

  it('returns false for unparseable version', () => {
    expect(satisfiesRange('invalid', '^1.0.0')).toBe(false);
  });

  it('returns false for unparseable range', () => {
    expect(satisfiesRange('1.0.0', 'latest')).toBe(false);
  });
});
