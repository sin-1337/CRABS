/**
 * Processes changing the player's interaction permission level.
 * @param {number} level - The target permission level (0 to 5).
 */
export function setPermissionLevel(level: number): void {
  const globalWindow = window as any;
  const player = globalWindow.Player;
  const serverUpdate = globalWindow.ServerAccountUpdate;

  if (player && !isNaN(level)) {
    player.AllowedInteractions = level;
    if (serverUpdate && typeof serverUpdate.QueueData === "function") {
      serverUpdate.QueueData({
        AllowedInteractions: player.AllowedInteractions,
      });
    }
  }
}

/**
 * Generates the HTML option tags for the permission dropdown.
 * @returns {string} Compiled HTML `<option>` elements.
 */
export function drawPermissionOptions(): string {
  const globalWindow = window as any;
  const player = globalWindow.Player;
  const selected: number = player?.AllowedInteractions ?? 0;
  let htmlOutput = "";

  const textGetInScope = globalWindow.TextGetInScope;

  for (const index of [0, 1, 2, 3, 4, 5]) {
    let permissionText = `Permission Level ${index}`;

    if (typeof textGetInScope === "function") {
      try {
        permissionText = textGetInScope(
          "Screens/Character/InformationSheet/Text_InformationSheet.csv",
          "AllowedInteraction" + index.toString(),
        );
      } catch {
        permissionText = `Permission ${index}`;
      }
    }

    htmlOutput += `<option${index === selected ? " selected" : ""} value="${index}">${permissionText}</option>`;
  }

  return htmlOutput;
}
