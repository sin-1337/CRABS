import { CrossMod } from "../crossmod";
import { Settings } from "../settings";

/**
 * Checks if the player's eyes are currently closed.
 * @returns {boolean} True if eyes are closed, false otherwise.
 */
export function isEyesClosed(): boolean {
  const playerWindow = (window as any).Player;

  const characterIsEyesClosed = (window as any).CharacterIsEyesClosed;
  if (typeof characterIsEyesClosed === "function") {
    return characterIsEyesClosed(playerWindow);
  }

  if (typeof (playerWindow as any).IsEyesClosed === "function") {
    return (playerWindow as any).IsEyesClosed();
  }

  if (Array.isArray(playerWindow.Appearance)) {
    const eyesItem = playerWindow.Appearance.find(
      (item: any) =>
        item.Asset && item.Asset.Group && item.Asset.Group.Name === "Eyes",
    );

    if (eyesItem) {
      return eyesItem.Property?.Expression === "Closed";
    }
  }

  return false;
}

/**
 * Determines the current blindness level of the player (0 to 4).
 * Accounts for immersive settings and BCX rules.
 * @returns {number} The blindness level.
 */
export function getBlindnessLevel(): number {
  if (!Settings.instance.data.immersiveBlind) return 0;

  if (
    Settings.instance.data.respectBcxRules &&
    CrossMod.isBCXRuleEnforced("alt_eyes_fullblind")
  ) {
    if (isEyesClosed()) {
      return 4;
    }
  }

  const playerWindow = (window as any).Player;

  if (playerWindow.HasEffect("BlindTotal")) return 4;
  if (playerWindow.HasEffect("BlindHeavy")) return 3;
  if (playerWindow.HasEffect("BlindNormal")) return 2;
  if (playerWindow.HasEffect("BlindLight")) return 1;
  return 0;
}
