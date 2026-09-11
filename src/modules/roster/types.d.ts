// modules/roster/types.d.ts
declare global {
  interface Window {
    PlayerFocus: (typeof import("./roster").Roster)["prototype"]["showPlayerFocus"];
    fakePlayerCommand: (typeof import("./roster").Roster)["prototype"]["fakePlayerCommand"];
    crabsCloseItem: () => void;
  }

  /** Identifies specific dungeon key tiers. */
  type KeysType = "bronze" | "silver" | "gold";

  /** Target specifier for key drop actions. */
  type DropTarget = KeyType | "all";

  /**
   * Snapshot of room keys currently in the local player's possession.
   */
  interface KeyState {
    hasBronze: boolean;
    hasSilver: boolean;
    hasGold: boolean;
    hasAny: boolean;
    keyStateString: string;
  }
}

export {};
