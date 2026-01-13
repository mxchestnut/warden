/**
 * PlayFab SDK module declarations
 * The playfab-sdk doesn't have TypeScript definitions, so we provide our own
 */

declare module 'playfab-sdk/Scripts/PlayFab/PlayFab' {
  const PlayFab: any;
  export = PlayFab;
}

declare module 'playfab-sdk/Scripts/PlayFab/PlayFabClient' {
  const PlayFabClient: any;
  export = PlayFabClient;
}
