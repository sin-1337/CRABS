import { CrossMod } from "../crossmod";

/**
 * Calculates a numerical score for sorting the roster. Lower score = higher on the list.
 * @param {any} character - The character to sort.
 * @param {string} mode - The sorting algorithm to apply ("none", "role", "ds", "lovers", "friends", "whitelist", "blacklist").
 * @param {number} [naturalIndex=0] - The original room array index of the character.
 * @returns {number} The computed order weight.
 */
export function calculateSortScore(
  character: any,
  mode: string,
  naturalIndex: number = 0,
): number {
  if (character.IsPlayer && character.IsPlayer()) return 0;

  const mNum = character.MemberNumber ?? -1;
  const player = (window as any).Player;
  const chatRoomData = (window as any).ChatRoomData;
  const isBestFriend =
    CrossMod.detectMod("BCTweaks") &&
    player.BCT?.bctSettings?.bestFriendsList?.includes(mNum);

  switch (mode) {
    case "none":
    case "natural":
      return naturalIndex;
    case "ds":
      if (player.OwnerNumber && player.OwnerNumber() === mNum) return 1;
      if (
        typeof character.IsOwnedByPlayer === "function" &&
        character.IsOwnedByPlayer(player.MemberNumber ?? -1)
      ) {
        return character.Ownership?.Stage === 0 ? 3 : 2;
      }
      if (
        typeof player.IsInFamilyOfMemberNumber === "function" &&
        player.IsInFamilyOfMemberNumber(mNum)
      )
        return 4;
      return 5;
    case "lovers":
      if (player.GetLoversNumbers && player.GetLoversNumbers().includes(mNum))
        return 1;
      if (isBestFriend) return 2;
      if (player.FriendList && player.FriendList.includes(mNum)) return 3;
      return 4;
    case "friends":
      if (isBestFriend) return 1;
      if (player.FriendList && player.FriendList.includes(mNum)) return 2;
      return 3;
    case "whitelist":
      if (player.WhiteList && player.WhiteList.includes(mNum)) return 1;
      if (player.BlackList && player.BlackList.includes(mNum)) return 3;
      return 2;
    case "blacklist":
      if (player.BlackList && player.BlackList.includes(mNum)) return 1;
      if (player.WhiteList && player.WhiteList.includes(mNum)) return 2;
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
