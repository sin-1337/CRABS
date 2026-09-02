import { CRABS_Base } from "../base";
import { CrossMod } from "../crossmod";

/**
 * Returns localized label for a sort mode key.
 *
 * @param {string} mode - The sort mode identifier.
 * @returns {string} The localized label.
 */
export function getSortOptionLabel(mode: string): string {
  return CRABS_Base.translate(`roster.sort_options.${mode}`);
}

/**
 * Calculates a numerical score for sorting the roster. Lower score = higher on the list.
 *
 * @param {any} character - The character to sort.
 * @param {string} mode - The sorting algorithm to apply.
 * @param {number} [naturalIndex=0] - The original room array index of the character.
 * @returns {number} The computed order weight.
 */
export function calculateSortScore(
  character: any,
  mode: string,
  naturalIndex: number = 0,
): number {
  switch (mode) {
    case "none":
    case "natural":
      return naturalIndex;
    default:
      break;
  }

  if (character.IsPlayer && character.IsPlayer()) return 0;

  const globalWindow = window as any;
  const player = globalWindow.Player;
  const chatRoomData = globalWindow.ChatRoomData;
  const mNum = character.MemberNumber ?? -1;
  const isBestFriend =
    CrossMod.detectMod("BCTweaks") &&
    player?.BCT?.bctSettings?.bestFriendsList?.includes(mNum);

  switch (mode) {
    case "ds":
      if (player?.OwnerNumber && player.OwnerNumber() === mNum) return 1;
      if (
        typeof character.IsOwnedByPlayer === "function" &&
        character.IsOwnedByPlayer(player?.MemberNumber ?? -1)
      ) {
        return character.Ownership?.Stage === 0 ? 3 : 2;
      }
      if (
        typeof player?.IsInFamilyOfMemberNumber === "function" &&
        player.IsInFamilyOfMemberNumber(mNum)
      )
        return 4;
      return 5;
    case "lovers":
      if (player?.GetLoversNumbers && player.GetLoversNumbers().includes(mNum))
        return 1;
      if (isBestFriend) return 2;
      if (player?.FriendList && player.FriendList.includes(mNum)) return 3;
      return 4;
    case "friends":
      if (isBestFriend) return 1;
      if (player?.FriendList && player.FriendList.includes(mNum)) return 2;
      return 3;
    case "whitelist":
      if (player?.WhiteList && player.WhiteList.includes(mNum)) return 1;
      if (player?.BlackList && player.BlackList.includes(mNum)) return 3;
      return 2;
    case "blacklist":
      if (player?.BlackList && player.BlackList.includes(mNum)) return 1;
      if (player?.WhiteList && player.WhiteList.includes(mNum)) return 2;
      return 3;
    case "role":
      if (chatRoomData?.Admin && chatRoomData.Admin.includes(mNum)) return 1;
      if (chatRoomData?.Whitelist && chatRoomData.Whitelist.includes(mNum))
        return 2;
      return 3;
    default:
      return naturalIndex;
  }
}
