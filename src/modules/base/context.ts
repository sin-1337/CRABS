/**
 * CRABS Game Context & Map State Utilities
 *
 * Environment checks for location blocks, blindness conditions, map views,
 * and key interactions.
 *
 * @module base/context
 */

import { translate } from "./localization";

/**
 * Checks if location sharing aids and compasses are disabled by room settings or blindness.
 *
 * @returns {boolean} True if compass indicators must be suppressed.
 */
export function isCompassBlocked(): boolean {
  const globalWindow = window as any;
  const roomData = globalWindow.ChatRoomData;

  // 1. Room-level opt-out tag
  if (
    Array.isArray(roomData?.BlockCategory) &&
    roomData.BlockCategory.includes("Location")
  ) {
    return true;
  }

  // 2. Blindness check (Global helper fallback + instance method check)
  const player = globalWindow.Player;
  if (player) {
    if (typeof globalWindow.CharacterGetBlindLevel === "function") {
      if (globalWindow.CharacterGetBlindLevel(player) > 0) return true;
    } else if (
      typeof player.GetBlindLevel === "function" &&
      player.GetBlindLevel() > 0
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the player is currently inside an active dungeon canvas map view.
 *
 * @returns {boolean} True if player is on a map.
 */
export function isMap(): boolean {
  const globalWindow = window as any;
  return (
    typeof globalWindow.ChatRoomMapViewIsActive === "function" &&
    globalWindow.ChatRoomMapViewIsActive()
  );
}

/**
 * Drops one or all keys currently held by the player in map mode.
 *
 * @param target - Target key category ("bronze" | "silver" | "gold" | "all").
 * @returns {boolean} True if at least one key was dropped.
 */
export function dropMapKey(
  target: "bronze" | "silver" | "gold" | "all",
): boolean {
  const globalWindow = window as any;
  const player = globalWindow.Player;

  if (!isMap()) {
    if (typeof globalWindow.ChatRoomSendLocal === "function") {
      globalWindow.ChatRoomSendLocal(translate("base.dropkeys_not_map"));
    }
    return false;
  }

  const pState = player?.MapData?.PrivateState;
  if (!pState) return false;

  let droppedAny = false;

  const tryDrop = (
    keyProp: "HasKeyBronze" | "HasKeySilver" | "HasKeyGold",
    colorKey: string,
  ) => {
    if (pState[keyProp]) {
      pState[keyProp] = false;
      droppedAny = true;
      if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(
          translate("base.dropkeys_dropped", {
            color: translate(`base.keys.${colorKey}`),
          }),
        );
      }
    }
  };

  if (target === "bronze" || target === "all")
    tryDrop("HasKeyBronze", "bronze");
  if (target === "silver" || target === "all")
    tryDrop("HasKeySilver", "silver");
  if (target === "gold" || target === "all") tryDrop("HasKeyGold", "gold");

  return droppedAny;
}
