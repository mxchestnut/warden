/**
 * PlayFab API type definitions
 * Based on PlayFab SDK structure for Pathfinder character sheets
 */

/**
 * PlayFab login request
 */
export interface PlayFabLoginRequest {
  PlayFabId?: string;
  CustomId?: string;
  PlayFabUserId?: string;
  UserName?: string;
  Email?: string;
  Password?: string;
}

/**
 * PlayFab API callback result
 */
export interface PlayFabResult<T = any> {
  code: number;
  status: string;
  data: T;
}

/**
 * PlayFab error response
 */
export interface PlayFabError {
  code?: number;
  status?: string;
  error?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * PlayFab user data response
 */
export interface PlayFabUserDataResult {
  Data?: Record<string, PlayFabUserDataValue>;
  DataVersion?: number;
}

export interface PlayFabUserDataValue {
  Value?: string;
  LastUpdated: string;
  Permission: string;
}

/**
 * Character data from PlayFab (general structure)
 */
export interface PlayFabCharacterData {
  [key: string]: any;
  charInfo?: {
    name?: string;
    race?: string;
    class?: string;
    level?: number;
    specialAbilities?: any[];
    classAbilities?: any[];
    traits?: any[];
  };
  abilities?: any;
  combatStats?: any;
  skills?: any;
  feats?: any;
  weapons?: any[];
  armor?: any;
  spells?: any;
  savingThrows?: any;
  defensiveAbilities?: any;
  casterInfo?: any;
}

/**
 * Character skill data
 */
export interface CharacterSkill {
  name: string;
  bonus: number;
  abilityModifier?: string;
  classSkill?: boolean;
  ranks?: number;
}

/**
 * Character feat data
 */
export interface CharacterFeat {
  name: string;
  description?: string;
}

/**
 * Character weapon data
 */
export interface CharacterWeapon {
  name: string;
  bonus?: number;
  damage?: string;
  critical?: string;
  range?: string;
  type?: string;
}

/**
 * Character spell data
 */
export interface CharacterSpell {
  name: string;
  level?: number;
  castingTime?: string;
  range?: string;
  duration?: string;
}

/**
 * PlayFab callback function signature
 */
export type PlayFabCallback<T = any> = (error: PlayFabError | null, result?: PlayFabResult<T>) => void;

/**
 * PlayFab client reference (untyped SDK)
 */
export interface PlayFabClientAPI {
  LoginWithPlayFab(request: PlayFabLoginRequest, callback: PlayFabCallback): void;
  LoginWithEmailAddress(request: PlayFabLoginRequest, callback: PlayFabCallback): void;
  GetUserData(request: any, callback: PlayFabCallback<PlayFabUserDataResult>): void;
  UpdateUserData(request: any, callback: PlayFabCallback): void;
  [key: string]: any;
}
