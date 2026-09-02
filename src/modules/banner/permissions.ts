import { CRABS_Base } from "../base";

/**
 * Updates the player's interaction permissions.
 *
 * @param {number} level - The interaction permission level (0 to 5).
 * @returns {void}
 */
export function setPermissionLevel(level: number): void {
  if (typeof Player === "undefined" || !Player || isNaN(level)) return;

  Player.AllowedInteractions = level;
  if (
    typeof ServerAccountUpdate !== "undefined" &&
    ServerAccountUpdate?.QueueData
  ) {
    ServerAccountUpdate.QueueData({
      AllowedInteractions: Player.AllowedInteractions,
    });
  }
}

/**
 * Generates HTML string for the permission selection options, querying
 * the base game's InformationSheet CSV and falling back to localized strings.
 *
 * @returns {string} The HTML options string.
 */
export function drawPermissionOptions(): string {
  let htmlOutput: string = "";
  let selected: number =
    typeof Player !== "undefined" ? Player.AllowedInteractions : 0;

  for (let index of [0, 1, 2, 3, 4, 5]) {
    let permission_text = CRABS_Base.translate(
      "banner.permissions.fallback_option",
      { index },
    );

    if (typeof TextGetInScope === "function") {
      try {
        permission_text = (TextGetInScope as any)(
          "Screens/Character/InformationSheet/Text_InformationSheet.csv",
          "AllowedInteraction" + index.toString(),
        );
      } catch {
        permission_text = CRABS_Base.translate(
          "banner.permissions.fallback_option",
          { index },
        );
      }
    }
    htmlOutput += `<option${index === selected ? " selected" : ""} value="${index}">${permission_text}</option>`;
  }
  return htmlOutput;
}
