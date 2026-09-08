declare const Player: any;
declare const ServerAccountUpdate: any;
declare const ServerPlayerIsInChatRoom: () => boolean;
declare const ServerPackItemPermissions: (items: any) => any;
declare const ChatRoomCharacterUpdate: (C: any) => void;

export function setPermissionLevel(level: number): void {
  if (typeof Player === "undefined" || !Player || isNaN(level)) return;

  const clampedLevel = Math.max(0, Math.min(5, Math.floor(level)));

  Player.AllowedInteractions = clampedLevel;
  Player.ItemPermission = clampedLevel;

  if (
    typeof ServerAccountUpdate !== "undefined" &&
    ServerAccountUpdate?.QueueData
  ) {
    let packed = {};
    if (
      typeof ServerPackItemPermissions === "function" &&
      Player.PermissionItems
    ) {
      packed = ServerPackItemPermissions(Player.PermissionItems);
    }

    ServerAccountUpdate.QueueData({
      ItemPermission: clampedLevel,
      AllowedInteractions: clampedLevel,
      ...packed,
    });
  }

  if (
    typeof ServerPlayerIsInChatRoom === "function" &&
    ServerPlayerIsInChatRoom()
  ) {
    if (typeof ChatRoomCharacterUpdate === "function") {
      ChatRoomCharacterUpdate(Player);
    }
  }
}

export function drawPermissionOptions(): string {
  let htmlOutput = "";
  const selected: number =
    typeof Player !== "undefined"
      ? (Player.AllowedInteractions ?? Player.ItemPermission ?? 0)
      : 0;

  // Hardcode the native BC labels to prevent cache misses
  const labels: Record<number, string> = {
    0: "Everyone, no exceptions",
    1: "Everyone, except blacklist",
    2: "Owner, Lover, whitelist & Dominants",
    3: "Owner, Lover and whitelist only",
    4: "Owner and Lover only",
    5: "Owner only",
  };

  for (let index = 0; index <= 5; index++) {
    const label = labels[index];
    const isSelected = index === selected ? " selected" : "";
    htmlOutput += `<option${isSelected} value="${index}">${label}</option>`;
  }

  return htmlOutput;
}
