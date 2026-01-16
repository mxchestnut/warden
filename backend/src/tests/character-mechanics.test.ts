import { describe, it, expect } from 'vitest';

describe('Character Mechanics Tests', () => {
  describe('Character Data Structure', () => {
    it('should have valid character structure', () => {
      const character = {
        id: 1,
        userId: 1,
        name: 'Aragorn',
        race: 'Human',
        class: 'Ranger',
        level: 10,
        alignment: 'Neutral Good',
        stats: {
          str: 18,
          dex: 14,
          con: 16,
          int: 12,
          wis: 15,
          cha: 13
        },
        hp: { current: 85, max: 100 },
        ac: 18,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(character).toHaveProperty('id');
      expect(character).toHaveProperty('name');
      expect(character).toHaveProperty('stats');
      expect(character.stats.str).toBeGreaterThan(0);
      expect(character.hp.current).toBeLessThanOrEqual(character.hp.max);
    });

    it('should validate stat ranges (3-18)', () => {
      const validStats = { str: 15, dex: 12, con: 14, int: 10, wis: 13, cha: 16 };
      const isValid = Object.values(validStats).every(stat => stat >= 3 && stat <= 18);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid stats', () => {
      const invalidStats = { str: 25, dex: 0, con: 14, int: 10, wis: 13, cha: 16 };
      const isValid = Object.values(invalidStats).every(stat => stat >= 3 && stat <= 18);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Stat Modifiers', () => {
    const getModifier = (stat: number): number => {
      return Math.floor((stat - 10) / 2);
    };

    it('should calculate correct ability modifiers', () => {
      expect(getModifier(10)).toBe(0);
      expect(getModifier(12)).toBe(1);
      expect(getModifier(18)).toBe(4);
      expect(getModifier(8)).toBe(-1);
      expect(getModifier(3)).toBe(-4);
    });

    it('should handle edge cases', () => {
      expect(getModifier(1)).toBe(-5);
      expect(getModifier(20)).toBe(5);
    });
  });

  describe('Character Level Progression', () => {
    const calculateXPForLevel = (level: number): number => {
      return (level - 1) * 1000;
    };

    it('should calculate XP requirements correctly', () => {
      expect(calculateXPForLevel(1)).toBe(0);
      expect(calculateXPForLevel(2)).toBe(1000);
      expect(calculateXPForLevel(5)).toBe(4000);
      expect(calculateXPForLevel(10)).toBe(9000);
    });

    it('should validate level range', () => {
      const isValidLevel = (level: number) => level >= 1 && level <= 20;
      
      expect(isValidLevel(1)).toBe(true);
      expect(isValidLevel(10)).toBe(true);
      expect(isValidLevel(20)).toBe(true);
      expect(isValidLevel(0)).toBe(false);
      expect(isValidLevel(21)).toBe(false);
    });
  });

  describe('Dice Rolling', () => {
    const rollDice = (sides: number): number => {
      return Math.floor(Math.random() * sides) + 1;
    };

    const rollMultipleDice = (count: number, sides: number): number => {
      let total = 0;
      for (let i = 0; i < count; i++) {
        total += rollDice(sides);
      }
      return total;
    };

    it('should roll within valid range', () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDice(20);
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(20);
      }
    });

    it('should roll multiple dice', () => {
      const result = rollMultipleDice(3, 6);
      expect(result).toBeGreaterThanOrEqual(3); // minimum
      expect(result).toBeLessThanOrEqual(18); // maximum
    });

    it('should parse dice notation', () => {
      const notation = '2d6+3';
      const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
      
      expect(match).toBeTruthy();
      expect(match![1]).toBe('2'); // count
      expect(match![2]).toBe('6'); // sides
      expect(match![3]).toBe('+3'); // modifier
    });
  });

  describe('HP Management', () => {
    it('should not allow HP to exceed maximum', () => {
      const hp = { current: 85, max: 100 };
      const healing = 20;
      const newHP = Math.min(hp.current + healing, hp.max);
      
      expect(newHP).toBe(100);
      expect(newHP).toBeLessThanOrEqual(hp.max);
    });

    it('should not allow HP below 0', () => {
      const hp = { current: 10, max: 100 };
      const damage = 15;
      const newHP = Math.max(hp.current - damage, 0);
      
      expect(newHP).toBe(0);
      expect(newHP).toBeGreaterThanOrEqual(0);
    });

    it('should track unconscious state', () => {
      const hp = { current: 0, max: 100 };
      const isUnconscious = hp.current <= 0;
      
      expect(isUnconscious).toBe(true);
    });
  });

  describe('Inventory Management', () => {
    it('should track equipped items', () => {
      const inventory = {
        weapons: [{ name: 'Longsword', damage: '1d8', equipped: true }],
        armor: [{ name: 'Chainmail', ac: 6, equipped: true }],
        items: [{ name: 'Healing Potion', quantity: 3 }]
      };

      expect(inventory.weapons.length).toBeGreaterThan(0);
      expect(inventory.weapons[0].equipped).toBe(true);
      expect(inventory.items[0].quantity).toBeGreaterThan(0);
    });

    it('should calculate total weight', () => {
      const items = [
        { name: 'Sword', weight: 3 },
        { name: 'Shield', weight: 6 },
        { name: 'Rations', weight: 2, quantity: 5 }
      ];

      const totalWeight = items.reduce((sum, item) => {
        if (!item) return sum;
        return sum + (((item?.weight ?? 0) * ('quantity' in item ? (item as any).quantity : 1)));
      }, 0);

      expect(totalWeight).toBe(19); // 3 + 6 + (2*5)
    });
  });

  describe('Combat Calculations', () => {
    const calculateAttackBonus = (level: number, str: number): number => {
      const baseAttack = level;
      const strModifier = Math.floor((str - 10) / 2);
      return baseAttack + strModifier;
    };

    it('should calculate attack bonus correctly', () => {
      expect(calculateAttackBonus(5, 16)).toBe(8); // 5 + 3
      expect(calculateAttackBonus(10, 18)).toBe(14); // 10 + 4
    });

    it('should calculate armor class', () => {
      const baseAC = 10;
      const dexModifier = 2;
      const armorBonus = 6;
      const shieldBonus = 2;
      
      const totalAC = baseAC + dexModifier + armorBonus + shieldBonus;
      
      expect(totalAC).toBe(20);
    });
  });
});
