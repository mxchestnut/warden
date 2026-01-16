import { describe, it, expect } from 'vitest';
import { getParam, getIdParam } from '../../utils/params';

describe('Params Utility', () => {
  describe('getParam', () => {
    it('should return string as-is', () => {
      const result = getParam('test-value');
      expect(result).toBe('test-value');
    });

    it('should return first element from array', () => {
      const result = getParam(['first', 'second', 'third']);
      expect(result).toBe('first');
    });

    it('should handle empty string', () => {
      const result = getParam('');
      expect(result).toBe('');
    });

    it('should handle array with single element', () => {
      const result = getParam(['only-one']);
      expect(result).toBe('only-one');
    });

    it('should handle special characters in string', () => {
      const result = getParam('test-value_123!@#');
      expect(result).toBe('test-value_123!@#');
    });
  });

  describe('getIdParam', () => {
    it('should parse numeric string to integer', () => {
      const result = getIdParam('42');
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should parse first element from array', () => {
      const result = getIdParam(['123', '456']);
      expect(result).toBe(123);
    });

    it('should handle zero', () => {
      const result = getIdParam('0');
      expect(result).toBe(0);
    });

    it('should handle negative numbers', () => {
      const result = getIdParam('-5');
      expect(result).toBe(-5);
    });

    it('should return NaN for invalid input', () => {
      const result = getIdParam('not-a-number');
      expect(result).toBeNaN();
    });

    it('should handle large numbers', () => {
      const result = getIdParam('999999999');
      expect(result).toBe(999999999);
    });

    it('should truncate decimal numbers', () => {
      const result = getIdParam('42.7');
      expect(result).toBe(42);
    });
  });
});
