// modules/roster/types.d.ts

declare global {
  interface Window {
    PlayerFocus: (typeof import("./roster").Roster)["prototype"]["showPlayerFocus"];
    fakePlayerCommand: (typeof import("./roster").Roster)["prototype"]["fakePlayerCommand"];
    crabsCloseItem: () => void;
  }
}

export {};
