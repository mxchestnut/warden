import { describe, it, expect } from 'vitest';

// Common validation utilities
describe('Validation Utilities', () => {
  describe('Email validation', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
      expect(isValidEmail('name+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });
  });

  describe('Username validation', () => {
    const isValidUsername = (username: string): boolean => {
      return username.length >= 3 && 
             username.length <= 20 && 
             /^[a-zA-Z0-9_-]+$/.test(username);
    };

    it('should validate correct usernames', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('test_user')).toBe(true);
      expect(isValidUsername('user-name')).toBe(true);
      expect(isValidUsername('abc')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false); // too short
      expect(isValidUsername('a'.repeat(21))).toBe(false); // too long
      expect(isValidUsername('user name')).toBe(false); // spaces
      expect(isValidUsername('user@name')).toBe(false); // special chars
    });
  });

  describe('Password strength validation', () => {
    const isStrongPassword = (password: string): boolean => {
      return password.length >= 8 &&
             /[a-z]/.test(password) &&
             /[A-Z]/.test(password) &&
             /[0-9]/.test(password);
    };

    it('should validate strong passwords', () => {
      expect(isStrongPassword('Password123')).toBe(true);
      expect(isStrongPassword('MyPass99')).toBe(true);
      expect(isStrongPassword('Secure1Password')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(isStrongPassword('short1')).toBe(false); // too short
      expect(isStrongPassword('alllowercase')).toBe(false); // no uppercase
      expect(isStrongPassword('ALLUPPERCASE')).toBe(false); // no lowercase
      expect(isStrongPassword('NoNumbers')).toBe(false); // no numbers
      expect(isStrongPassword('password')).toBe(false); // too weak
    });
  });

  describe('Character name validation', () => {
    const isValidCharacterName = (name: string): boolean => {
      return name.length >= 2 && 
             name.length <= 50 && 
             /^[a-zA-Z0-9\s'-]+$/.test(name);
    };

    it('should validate correct character names', () => {
      expect(isValidCharacterName('Aragorn')).toBe(true);
      expect(isValidCharacterName("O'Brien")).toBe(true);
      expect(isValidCharacterName('Jean-Luc')).toBe(true);
      expect(isValidCharacterName('Sir Galahad')).toBe(true);
    });

    it('should reject invalid character names', () => {
      expect(isValidCharacterName('A')).toBe(false); // too short
      expect(isValidCharacterName('a'.repeat(51))).toBe(false); // too long
      expect(isValidCharacterName('Name@123')).toBe(false); // invalid chars
    });
  });

  describe('Dice notation validation', () => {
    const isValidDiceNotation = (notation: string): boolean => {
      return /^\d+d\d+([+-]\d+)?$/i.test(notation);
    };

    it('should validate correct dice notation', () => {
      expect(isValidDiceNotation('1d20')).toBe(true);
      expect(isValidDiceNotation('2d6')).toBe(true);
      expect(isValidDiceNotation('3d8+5')).toBe(true);
      expect(isValidDiceNotation('1d100-10')).toBe(true);
    });

    it('should reject invalid dice notation', () => {
      expect(isValidDiceNotation('d20')).toBe(false);
      expect(isValidDiceNotation('2d')).toBe(false);
      expect(isValidDiceNotation('roll 1d20')).toBe(false);
      expect(isValidDiceNotation('1d20+')).toBe(false);
    });
  });

  describe('Sanitization', () => {
    const sanitizeHtml = (input: string): string => {
      return input.replace(/<[^>]*>/g, '');
    };

    it('should remove HTML tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeHtml('<b>bold</b> text')).toBe('bold text');
      expect(sanitizeHtml('normal text')).toBe('normal text');
    });

    const trimWhitespace = (input: string): string => {
      return input.trim().replace(/\s+/g, ' ');
    };

    it('should normalize whitespace', () => {
      expect(trimWhitespace('  multiple   spaces  ')).toBe('multiple spaces');
      expect(trimWhitespace('\n\ttabs\n')).toBe('tabs');
    });
  });
});
