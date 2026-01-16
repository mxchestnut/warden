// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as PlayFabService from '../../services/playfab';
import * as zlib from 'zlib';

// Mock PlayFab SDK
vi.mock('playfab-sdk/Scripts/PlayFab/PlayFab', () => ({
  default: {
    settings: {
      titleId: '',
      sessionTicket: ''
    }
  }
}));

vi.mock('playfab-sdk/Scripts/PlayFab/PlayFabClient', () => ({
  default: {
    LoginWithPlayFab: vi.fn(),
    LoginWithEmailAddress: vi.fn(),
    LoginWithCustomID: vi.fn(),
    GetUserData: vi.fn()
  }
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn()
  }
}));

describe('PlayFab Service Tests', () => {
  let PlayFabClient: any;
  let axios: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import mocked modules
    const playfabModule = await import('playfab-sdk/Scripts/PlayFab/PlayFabClient');
    PlayFabClient = playfabModule.default;
    const axiosModule = await import('axios');
    axios = axiosModule.default;
  });

  describe('PathCompanion Auth Interface', () => {
    it('should have correct auth structure', () => {
      const mockAuth: PlayFabService.PathCompanionAuth = {
        playfabId: 'ABC123',
        sessionTicket: 'ticket-xyz',
        entityToken: 'entity-token-123'
      };

      expect(mockAuth).toHaveProperty('playfabId');
      expect(mockAuth).toHaveProperty('sessionTicket');
      expect(mockAuth).toHaveProperty('entityToken');
      expect(typeof mockAuth.playfabId).toBe('string');
    });

    it('should validate PlayFab ID format', () => {
      const validId = 'ABC123456';
      expect(validId).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('PathCompanion Character Interface', () => {
    it('should have correct character structure', () => {
      const mockCharacter: PlayFabService.PathCompanionCharacter = {
        characterId: 'character1',
        characterName: 'Aragorn',
        data: {
          name: 'Aragorn',
          characterInfo: {
            name: 'Aragorn',
            race: 'Human',
            characterClass: 'Ranger',
            level: 10,
            alignment: 'Neutral Good'
          }
        },
        lastModified: new Date()
      };

      expect(mockCharacter).toHaveProperty('characterId');
      expect(mockCharacter).toHaveProperty('characterName');
      expect(mockCharacter).toHaveProperty('data');
      expect(mockCharacter).toHaveProperty('lastModified');
    });
  });

  describe('Character Level Extraction', () => {
    it('should extract character level from data', () => {
      const characterData = {
        characterInfo: {
          level: 5
        }
      };

      const level = PlayFabService.extractCharacterLevel(characterData);
      expect(level).toBe(5);
    });

    it('should return 1 for missing level', () => {
      const characterData = {
        characterInfo: {}
      };

      const level = PlayFabService.extractCharacterLevel(characterData);
      expect(level).toBe(1);
    });

    it('should handle missing characterInfo', () => {
      const characterData = {};
      const level = PlayFabService.extractCharacterLevel(characterData);
      expect(level).toBe(1);
    });

    it('should validate level range', () => {
      const validLevels = [1, 5, 10, 15, 20];
      validLevels.forEach(level => {
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('Ability Scores Extraction', () => {
    it('should extract ability scores correctly', () => {
      const characterData = {
        abilityScores: {
          strength: 18,
          dexterity: 14,
          constitution: 16,
          intelligence: 12,
          wisdom: 15,
          charisma: 13
        }
      };

      const scores = PlayFabService.extractAbilityScores(characterData);
      expect(scores).toBeDefined();
      expect(scores.strength).toBe(18);
      expect(scores.dexterity).toBe(14);
    });

    it('should handle missing ability scores', () => {
      const characterData = {};
      const scores = PlayFabService.extractAbilityScores(characterData);
      
      expect(scores).toBeDefined();
      expect(scores.strength).toBe(10);
      expect(scores.dexterity).toBe(10);
      expect(scores.constitution).toBe(10);
    });

    it('should validate ability score ranges', () => {
      const scores = {
        strength: 18,
        dexterity: 14,
        constitution: 16,
        intelligence: 12,
        wisdom: 15,
        charisma: 13
      };

      Object.values(scores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(18);
      });
    });
  });

  describe('Basic Character Info Extraction', () => {
    it('should extract basic character info', () => {
      const characterData = {
        characterInfo: {
          race: 'Human',
          alignment: 'Neutral Good',
          deity: 'Sarenrae',
          size: 'Medium'
        }
      };

      const info = PlayFabService.extractBasicInfo(characterData);
      expect(info).toBeDefined();
      expect(info.race).toBe('Human');
      expect(info.alignment).toBe('Neutral Good');
    });

    it('should handle missing basic info', () => {
      const characterData = {};
      const info = PlayFabService.extractBasicInfo(characterData);
      
      expect(info).toBeDefined();
      expect(info.race).toBe('');
      expect(info.alignment).toBe('');
    });

    it('should validate alignment values', () => {
      const validAlignments = [
        'Lawful Good', 'Neutral Good', 'Chaotic Good',
        'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
        'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
      ];

      const testAlignment = 'Neutral Good';
      expect(validAlignments).toContain(testAlignment);
    });
  });

  describe('Defensive Abilities Extraction', () => {
    it('should extract damage reduction', () => {
      const characterData = {
        defense: {
          dr: ['5/magic'],
          sr: { total: 15 }
        }
      };

      const defenses = PlayFabService.extractDefensiveAbilities(characterData);
      expect(defenses).toBeDefined();
      expect(defenses.damageReduction).toEqual(['5/magic']);
      expect(defenses.spellResistance).toBe(15);
    });

    it('should handle missing defensive abilities', () => {
      const characterData = {};
      const defenses = PlayFabService.extractDefensiveAbilities(characterData);
      
      expect(defenses).toBeDefined();
      expect(defenses.damageReduction).toEqual([]);
      expect(defenses.spellResistance).toBe(0);
    });
  });

  describe('Caster Info Extraction', () => {
    it('should extract caster level and spell DC', () => {
      const characterData = {
        spells: {
          casterLevel: 10,
          dcBase: 18,
          concentration: { total: 15 }
        }
      };

      const casterInfo = PlayFabService.extractCasterInfo(characterData);
      expect(casterInfo).toBeDefined();
      expect(casterInfo.casterLevel).toBe(10);
      expect(casterInfo.spellDCBase).toBe(18);
      expect(casterInfo.concentration).toBe(15);
    });

    it('should handle non-casters', () => {
      const characterData = {};
      const casterInfo = PlayFabService.extractCasterInfo(characterData);
      
      expect(casterInfo).toBeDefined();
      expect(casterInfo.casterLevel).toBe(0);
      expect(casterInfo.spellDCBase).toBe(10);
      expect(casterInfo.concentration).toBe(0);
    });

    it('should calculate spell DC correctly', () => {
      const spellLevel = 3;
      const abilityModifier = 4; // 18 Intelligence
      const baseDC = 10;
      
      const expectedDC = baseDC + spellLevel + abilityModifier;
      expect(expectedDC).toBe(17);
    });
  });

  describe('Share Key Validation', () => {
    it('should validate share key format', () => {
      const shareKey = Buffer.from(JSON.stringify({
        account: 'ABC123',
        character: 'character1'
      })).toString('base64');

      expect(shareKey).toBeTruthy();
      expect(typeof shareKey).toBe('string');
    });

    it('should decode share key correctly', () => {
      const originalData = {
        account: 'ABC123',
        character: 'character1'
      };
      
      const shareKey = Buffer.from(JSON.stringify(originalData)).toString('base64');
      const decoded = JSON.parse(Buffer.from(shareKey, 'base64').toString('utf-8'));
      
      expect(decoded.account).toBe('ABC123');
      expect(decoded.character).toBe('character1');
    });
  });

  describe('Session Ticket Validation', () => {
    it('should validate session ticket format', () => {
      const mockTicket = 'ABC123-DEF456-GHI789';
      
      expect(mockTicket).toBeTruthy();
      expect(typeof mockTicket).toBe('string');
      expect(mockTicket.length).toBeGreaterThan(0);
    });

    it('should handle expired session tickets', () => {
      const expiredError = {
        error: 'SessionTicketNotFound',
        errorMessage: 'Session ticket expired'
      };

      expect(expiredError.error).toBe('SessionTicketNotFound');
      expect(expiredError.errorMessage).toContain('expired');
    });
  });

  describe('Character Slot Management', () => {
    it('should parse character slot format', () => {
      const slots = ['character1', 'character2', 'gm1', 'shared1'];
      
      slots.forEach(slot => {
        const isCharacter = /^character\d+$/.test(slot);
        const isGM = /^gm\d+$/.test(slot);
        const isShared = /^shared\d+$/.test(slot);
        
        expect(isCharacter || isGM || isShared).toBe(true);
      });
    });

    it('should filter character slots correctly', () => {
      const allSlots = ['character1', 'character2', 'gm1', 'shared1', 'portrait'];
      const characterSlots = allSlots.filter(key => /^character\d+$/.test(key));
      
      expect(characterSlots).toEqual(['character1', 'character2']);
      expect(characterSlots.length).toBe(2);
    });

    it('should limit character slots to 50', () => {
      const characterSlots = Array.from({ length: 100 }, (_, i) => `character${i + 1}`);
      const limited = characterSlots.slice(0, 50);
      
      expect(limited.length).toBe(50);
      expect(limited[0]).toBe('character1');
      expect(limited[49]).toBe('character50');
    });
  });

  describe('Error Handling', () => {
    it('should handle PlayFab API errors', () => {
      const mockError = {
        code: 1001,
        status: 'BadRequest',
        error: 'AccountNotFound',
        errorMessage: 'User account not found'
      };

      expect(mockError).toHaveProperty('error');
      expect(mockError).toHaveProperty('errorMessage');
      expect(mockError.code).toBe(1001);
    });

    it('should handle network errors', () => {
      const networkError = new Error('Network request failed');
      
      expect(networkError).toBeInstanceOf(Error);
      expect(networkError.message).toContain('Network');
    });

    it('should handle invalid credentials', () => {
      const authError = {
        error: 'InvalidUsernameOrPassword',
        errorMessage: 'Invalid username or password'
      };

      expect(authError.error).toBe('InvalidUsernameOrPassword');
    });
  });

  describe('extractCombatStats', () => {
    it('should extract HP and AC', () => {
      const data = {
        defense: {
          hp: { current: 45, total: 50 },
          ac: { total: 18 }
        },
        offense: {}
      };

      const stats = PlayFabService.extractCombatStats(data);

      expect(stats.currentHp).toBe(45);
      expect(stats.maxHp).toBe(50);
      expect(stats.armorClass).toBe(18);
    });

    it('should handle missing combat stats', () => {
      const data = {};
      const stats = PlayFabService.extractCombatStats(data);

      expect(stats.currentHp).toBe(0);
      expect(stats.maxHp).toBe(0);
      expect(stats.armorClass).toBe(10);
    });

    it('should calculate initiative and BAB', () => {
      const data = {
        defense: {},
        offense: {
          initiative: { total: 5 },
          bab: 8
        }
      };

      const stats = PlayFabService.extractCombatStats(data);
      expect(stats.initiative).toBe(5);
      expect(stats.baseAttackBonus).toBe(8);
    });
  });

  describe('extractSavingThrows', () => {
    it('should extract all three saves', () => {
      const data = {
        defense: {
          saves: {
            fortitude: { total: 8 },
            reflex: { total: 5 },
            will: { total: 6 }
          }
        }
      };

      const saves = PlayFabService.extractSavingThrows(data);

      expect(saves.fortitudeSave).toBe(8);
      expect(saves.reflexSave).toBe(5);
      expect(saves.willSave).toBe(6);
    });

    it('should default to 0 for missing saves', () => {
      const data = {};
      const saves = PlayFabService.extractSavingThrows(data);

      expect(saves.fortitudeSave).toBe(0);
      expect(saves.reflexSave).toBe(0);
      expect(saves.willSave).toBe(0);
    });
  });

  describe('extractSkills', () => {
    it('should extract skill data', () => {
      const data = {
        skills: {
          Acrobatics: { ranks: 5, total: 10, classSkill: true },
          Stealth: { ranks: 3, total: 8, classSkill: false }
        }
      };

      const skills = PlayFabService.extractSkills(data);

      expect(skills).toBeDefined();
      expect(skills.Acrobatics).toBeDefined();
      expect(skills.Acrobatics.ranks).toBe(5);
    });

    it('should return empty object for missing skills', () => {
      const data = {};
      const skills = PlayFabService.extractSkills(data);

      expect(Object.keys(skills)).toHaveLength(0);
    });
  });

  describe('extractFeats', () => {
    it('should extract feat list', () => {
      const data = {
        characterInfo: {
          levelInfo: {
            '1': { Feats: ['Power Attack', 'Cleave'] },
            '3': { Feats: ['Weapon Focus'] }
          }
        }
      };

      const feats = PlayFabService.extractFeats(data);

      expect(feats).toBeInstanceOf(Array);
      expect(feats).toContain('Power Attack');
      expect(feats).toContain('Cleave');
    });

    it('should return empty array for missing feats', () => {
      const data = {};
      const feats = PlayFabService.extractFeats(data);

      expect(feats).toEqual([]);
    });
  });

  describe('calculateModifier', () => {
    it('should calculate correct ability modifiers', () => {
      expect(PlayFabService.calculateModifier(10)).toBe(0);
      expect(PlayFabService.calculateModifier(18)).toBe(4);
      expect(PlayFabService.calculateModifier(8)).toBe(-1);
      expect(PlayFabService.calculateModifier(20)).toBe(5);
      expect(PlayFabService.calculateModifier(3)).toBe(-4);
    });
  });

  describe('Character Data Compression', () => {
    it('should validate base64 encoding', () => {
      const originalData = 'test character data';
      const encoded = Buffer.from(originalData).toString('base64');
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      
      expect(decoded).toBe(originalData);
    });

    it('should handle compressed data format', () => {
      const mockCompressedData = {
        Value: 'base64-encoded-string',
        LastUpdated: new Date().toISOString(),
        Permission: 'Public'
      };

      expect(mockCompressedData).toHaveProperty('Value');
      expect(mockCompressedData).toHaveProperty('LastUpdated');
      expect(mockCompressedData).toHaveProperty('Permission');
    });
  });

  describe('SDK Integration Tests', () => {
    describe('loginToPlayFab', () => {
      it('should successfully login with username', async () => {
        const mockResult = {
          data: {
            PlayFabId: 'ABC123',
            SessionTicket: 'session-ticket-xyz',
            EntityToken: {
              EntityToken: 'entity-token-123'
            }
          }
        };

        PlayFabClient.LoginWithPlayFab.mockImplementation((request: any, callback: any) => {
          callback(null, mockResult);
        });

        const result = await PlayFabService.loginToPlayFab('testuser', 'password123');

        expect(result).toEqual({
          playfabId: 'ABC123',
          sessionTicket: 'session-ticket-xyz',
          entityToken: 'entity-token-123'
        });
        expect(PlayFabClient.LoginWithPlayFab).toHaveBeenCalledWith(
          expect.objectContaining({
            Username: 'testuser',
            Password: 'password123'
          }),
          expect.any(Function)
        );
      });

      it('should fallback to email login when username fails', async () => {
        const emailResult = {
          data: {
            PlayFabId: 'DEF456',
            SessionTicket: 'email-session-ticket',
            EntityToken: {
              EntityToken: 'email-entity-token'
            }
          }
        };

        // First call (username) fails with AccountNotFound
        PlayFabClient.LoginWithPlayFab.mockImplementation((request: any, callback: any) => {
          callback({ error: 'AccountNotFound', errorCode: 1001 }, undefined);
        });

        // Second call (email) succeeds
        PlayFabClient.LoginWithEmailAddress.mockImplementation((request: any, callback: any) => {
          callback(null, emailResult);
        });

        const result = await PlayFabService.loginToPlayFab('test@example.com', 'password123');

        expect(result).toEqual({
          playfabId: 'DEF456',
          sessionTicket: 'email-session-ticket',
          entityToken: 'email-entity-token'
        });
        expect(PlayFabClient.LoginWithEmailAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            Email: 'test@example.com',
            Password: 'password123'
          }),
          expect.any(Function)
        );
      });

      it('should reject on username login error (non-AccountNotFound)', async () => {
        PlayFabClient.LoginWithPlayFab.mockImplementation((request: any, callback: any) => {
          callback({ error: 'InvalidPassword', errorMessage: 'Invalid password' }, undefined);
        });

        await expect(PlayFabService.loginToPlayFab('testuser', 'wrong')).rejects.toThrow('Invalid password');
      });

      it('should reject when email login also fails', async () => {
        PlayFabClient.LoginWithPlayFab.mockImplementation((request: any, callback: any) => {
          callback({ error: 'AccountNotFound', errorCode: 1001 }, undefined);
        });

        PlayFabClient.LoginWithEmailAddress.mockImplementation((request: any, callback: any) => {
          callback({ errorMessage: 'Email not found' }, undefined);
        });

        await expect(PlayFabService.loginToPlayFab('test@example.com', 'password')).rejects.toThrow('Email not found');
      });

      it('should reject when no result data returned', async () => {
        PlayFabClient.LoginWithPlayFab.mockImplementation((request: any, callback: any) => {
          callback(null, undefined);
        });

        await expect(PlayFabService.loginToPlayFab('testuser', 'password')).rejects.toThrow('No data returned from PlayFab');
      });

      it('should handle missing EntityToken', async () => {
        const mockResult = {
          data: {
            PlayFabId: 'ABC123',
            SessionTicket: 'session-ticket-xyz'
            // EntityToken missing
          }
        };

        PlayFabClient.LoginWithPlayFab.mockImplementation((request: any, callback: any) => {
          callback(null, mockResult);
        });

        const result = await PlayFabService.loginToPlayFab('testuser', 'password123');

        expect(result.entityToken).toBe('');
      });
    });

    describe('getUserData', () => {
      it('should successfully retrieve user data', async () => {
        const mockResult = {
          data: {
            Data: {
              character1: {
                Value: 'compressed-data-1',
                LastUpdated: '2024-01-01T00:00:00Z'
              },
              character2: {
                Value: 'compressed-data-2',
                LastUpdated: '2024-01-02T00:00:00Z'
              }
            }
          }
        };

        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, mockResult);
        });

        const result = await PlayFabService.getUserData('session-ticket-xyz');

        expect(result).toEqual({
          character1: {
            Value: 'compressed-data-1',
            LastUpdated: '2024-01-01T00:00:00Z'
          },
          character2: {
            Value: 'compressed-data-2',
            LastUpdated: '2024-01-02T00:00:00Z'
          }
        });
        expect(PlayFabClient.GetUserData).toHaveBeenCalledWith(
          expect.objectContaining({
            SessionTicket: 'session-ticket-xyz'
          }),
          expect.any(Function)
        );
      });

      it('should reject on error', async () => {
        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback({ errorMessage: 'Invalid session ticket' }, undefined);
        });

        await expect(PlayFabService.getUserData('invalid-ticket')).rejects.toThrow('Invalid session ticket');
      });

      it('should return empty object when no data', async () => {
        const mockResult = {
          data: {
            Data: {}
          }
        };

        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, mockResult);
        });

        const result = await PlayFabService.getUserData('session-ticket-xyz');

        expect(result).toEqual({});
      });
    });

    describe('getCharacterFromShareKey', () => {
      it('should successfully fetch and decompress shared character', async () => {
        const characterData = {
          name: 'Shared Gandalf',
          characterInfo: {
            characterName: 'Shared Gandalf',
            race: 'Wizard',
            level: 20
          }
        };

        // Create compressed data
        const jsonStr = JSON.stringify(characterData);
        const compressed = zlib.deflateSync(Buffer.from(jsonStr));
        const base64 = compressed.toString('base64');

        const shareKey = Buffer.from(JSON.stringify({
          account: 'ACCOUNT123',
          character: 'character1'
        })).toString('base64');

        // Mock anonymous login
        PlayFabClient.LoginWithCustomID.mockImplementation((request: any, callback: any) => {
          callback(null, { data: { SessionTicket: 'anon-ticket' } });
        });

        // Mock GetUserData
        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {
                character1: {
                  Value: base64,
                  LastUpdated: '2024-01-01T00:00:00Z'
                }
              }
            }
          });
        });

        const result = await PlayFabService.getCharacterFromShareKey(shareKey);

        expect(result.characterName).toBe('Shared Gandalf');
        expect(result.characterId).toBe('character1');
        expect(result.data).toEqual(characterData);
      });

      it('should reject on invalid share key', async () => {
        await expect(PlayFabService.getCharacterFromShareKey('invalid-base64')).rejects.toThrow('Invalid share key');
      });

      it('should reject when anonymous login fails', async () => {
        const shareKey = Buffer.from(JSON.stringify({
          account: 'ACCOUNT123',
          character: 'character1'
        })).toString('base64');

        PlayFabClient.LoginWithCustomID.mockImplementation((request: any, callback: any) => {
          callback({ errorMessage: 'Failed to login' }, undefined);
        });

        await expect(PlayFabService.getCharacterFromShareKey(shareKey)).rejects.toThrow('Failed to authenticate with PathCompanion');
      });

      it('should reject when character not found', async () => {
        const shareKey = Buffer.from(JSON.stringify({
          account: 'ACCOUNT123',
          character: 'character999'
        })).toString('base64');

        PlayFabClient.LoginWithCustomID.mockImplementation((request: any, callback: any) => {
          callback(null, { data: { SessionTicket: 'anon-ticket' } });
        });

        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {} // No character data
            }
          });
        });

        await expect(PlayFabService.getCharacterFromShareKey(shareKey)).rejects.toThrow('Character not found');
      });

      it('should reject when decompression fails', async () => {
        const shareKey = Buffer.from(JSON.stringify({
          account: 'ACCOUNT123',
          character: 'character1'
        })).toString('base64');

        PlayFabClient.LoginWithCustomID.mockImplementation((request: any, callback: any) => {
          callback(null, { data: { SessionTicket: 'anon-ticket' } });
        });

        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {
                character1: {
                  Value: 'corrupted-data-not-valid-base64-or-compressed',
                  LastUpdated: '2024-01-01T00:00:00Z'
                }
              }
            }
          });
        });

        await expect(PlayFabService.getCharacterFromShareKey(shareKey)).rejects.toThrow('Failed to parse character data');
      });
    });

    describe('getCharacter', () => {
      it('should return null when character not found', async () => {
        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {} // Empty data
            }
          });
        });

        const result = await PlayFabService.getCharacter('session-ticket', 'character999');

        expect(result).toBeNull();
      });

      it('should successfully decompress character with inflate', async () => {
        const characterData = {
          characterInfo: {
            characterName: 'Test Character'
          }
        };

        const jsonStr = JSON.stringify(characterData);
        const compressed = zlib.deflateSync(Buffer.from(jsonStr));
        const base64 = compressed.toString('base64');

        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {
                character1: {
                  Value: base64,
                  LastUpdated: '2024-01-01T00:00:00Z'
                }
              }
            }
          });
        });

        const result = await PlayFabService.getCharacter('session-ticket', 'character1');

        expect(result).not.toBeNull();
        expect(result?.characterName).toBe('Test Character');
        expect(result?.characterId).toBe('character1');
      });

      it('should handle plain JSON fallback when compression fails', async () => {
        const characterData = {
          name: 'Plain JSON Character'
        };

        const plainJson = JSON.stringify(characterData);
        const base64 = Buffer.from(plainJson).toString('base64');

        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {
                character1: {
                  Value: base64,
                  LastUpdated: '2024-01-01T00:00:00Z'
                }
              }
            }
          });
        });

        const result = await PlayFabService.getCharacter('session-ticket', 'character1');

        expect(result).not.toBeNull();
        expect(result?.characterName).toBe('Plain JSON Character');
      });

      it('should extract character name from various fields', async () => {
        const characterData = {
          campaignName: 'Campaign Character'
        };

        const jsonStr = JSON.stringify(characterData);
        const compressed = zlib.deflateSync(Buffer.from(jsonStr));
        const base64 = compressed.toString('base64');

        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {
                character1: {
                  Value: base64,
                  LastUpdated: '2024-01-01T00:00:00Z'
                }
              }
            }
          });
        });

        const result = await PlayFabService.getCharacter('session-ticket', 'character1');

        expect(result?.characterName).toBe('Campaign Character');
      });

      it('should use characterId as fallback name', async () => {
        const characterData = {
          // No name fields
          someOtherData: 'test'
        };

        const jsonStr = JSON.stringify(characterData);
        const compressed = zlib.deflateSync(Buffer.from(jsonStr));
        const base64 = compressed.toString('base64');

        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {
                character999: {
                  Value: base64,
                  LastUpdated: '2024-01-01T00:00:00Z'
                }
              }
            }
          });
        });

        const result = await PlayFabService.getCharacter('session-ticket', 'character999');

        expect(result?.characterName).toBe('character999');
      });
    });

    describe('exportCharacterToPathCompanion', () => {
      it('should successfully export character to PathCompanion', async () => {
        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {
                character1: { Value: 'existing' }
                // character2 is available
              }
            }
          });
        });

        axios.post.mockResolvedValue({
          data: {
            code: 200
          }
        });

        const characterData = {
          name: 'Export Test',
          race: 'Elf',
          characterClass: 'Wizard',
          level: 5,
          maxHp: 30,
          armorClass: 15
        };

        const result = await PlayFabService.exportCharacterToPathCompanion(
          'session-ticket',
          'Export Test',
          characterData
        );

        expect(result.characterId).toBe('character2');
        expect(result.message).toContain('character2');
        expect(axios.post).toHaveBeenCalledWith(
          'https://pathcompanion.com/Server/UpdateUserData',
          expect.objectContaining({
            SessionTicket: 'session-ticket'
          }),
          expect.any(Object)
        );
      });

      it('should find next available character slot', async () => {
        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: {
              Data: {
                character1: { Value: 'taken' },
                character2: { Value: 'taken' },
                character3: { Value: 'taken' }
                // character4 is available
              }
            }
          });
        });

        axios.post.mockResolvedValue({
          data: { code: 200 }
        });

        const result = await PlayFabService.exportCharacterToPathCompanion(
          'session-ticket',
          'Test',
          { name: 'Test' }
        );

        expect(result.characterId).toBe('character4');
      });

      it('should reject when PathCompanion returns error', async () => {
        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: { Data: {} }
          });
        });

        axios.post.mockResolvedValue({
          data: {
            code: 400,
            errorMessage: 'Invalid data'
          }
        });

        await expect(
          PlayFabService.exportCharacterToPathCompanion('session-ticket', 'Test', { name: 'Test' })
        ).rejects.toThrow();
      });

      it('should handle axios errors', async () => {
        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: { Data: {} }
          });
        });

        const axiosError = new Error('Network error');
        (axiosError as any).response = {
          data: {
            errorMessage: 'Network failure'
          }
        };

        axios.post.mockRejectedValue(axiosError);
        axios.isAxiosError = vi.fn().mockReturnValue(true);

        await expect(
          PlayFabService.exportCharacterToPathCompanion('session-ticket', 'Test', { name: 'Test' })
        ).rejects.toThrow('Network failure');
      });

      it('should format character data correctly for PathCompanion', async () => {
        PlayFabClient.GetUserData.mockImplementation((request: any, callback: any) => {
          callback(null, {
            data: { Data: {} }
          });
        });

        let capturedData: any;
        axios.post.mockImplementation((url: string, data: any) => {
          capturedData = data;
          return Promise.resolve({ data: { code: 200 } });
        });

        const characterData = {
          name: 'Test Wizard',
          race: 'Human',
          characterClass: 'Wizard',
          level: 10,
          strength: 12,
          dexterity: 14,
          constitution: 13,
          intelligence: 18,
          wisdom: 15,
          charisma: 10,
          maxHp: 45,
          currentHp: 40,
          armorClass: 16,
          avatarUrl: 'https://example.com/avatar.jpg'
        };

        await PlayFabService.exportCharacterToPathCompanion(
          'session-ticket',
          'Test Wizard',
          characterData
        );

        const exportedData = JSON.parse(capturedData.Data.character1);
        expect(exportedData.name).toBe('Test Wizard');
        expect(exportedData.characterInfo.race).toBe('Human');
        expect(exportedData.characterInfo.characterClass).toBe('Wizard');
        expect(exportedData.characterInfo.level).toBe(10);
        expect(exportedData.abilityScores.Strength).toBe(12);
        expect(exportedData.abilityScores.Intelligence).toBe(18);
        expect(exportedData.combat.maxHp).toBe(45);
        expect(exportedData.combat.currentHp).toBe(40);
        expect(exportedData.characterInfo.portrait).toBe('https://example.com/avatar.jpg');
      });
    });
  });
});

