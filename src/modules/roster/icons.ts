import { Assets } from "../assets";
import { CrossMod } from "../crossmod";

/**
 * Determines the status icons for a player based on their current effects (Deaf, Blind, Gagged).
 * @param {Character} character - The character object to check.
 * @returns {string} HTML string containing the status icons.
 */
export function setStatusIcons(character: any): string {
  const prefixes = ["Blind", "Gag", "Deaf"];
  const effects = (window as any).CharacterGetEffects(character);

  const effectLists: { [key: string]: { [key: string]: number } } = {
    Blind: {
      BlindLight: 1,
      BlindNormal: 2,
      BlindHeavy: 3,
      BlindTotal: 4,
    },
    Gag: {
      GagVeryLight: 1,
      GagEasy: 1,
      GagLight: 1,
      GagNormal: 2,
      GagMedium: 2,
      GagHeavy: 3,
      GagVeryHeavy: 3,
      GagTotal: 4,
      GagTotal2: 4,
      GagTotal3: 4,
      GagTotal4: 4,
    },
    Deaf: {
      DeafLight: 1,
      DeafNormal: 2,
      DeafHeavy: 3,
      DeafTotal: 4,
    },
  };

  const icons: { [key: string]: string } = {
    Blind: "",
    Gag: "",
    Deaf: "",
  };

  const updateIcon = (prefix: string, effect: string): void => {
    const effectName = effect.charAt(0).toLowerCase() + effect.slice(1);
    const effectList = effectLists[prefix];

    if (effect in effectList) {
      const effectValue = effectList[effect];
      if (
        effectValue >
        (icons[prefix] ? parseInt(icons[prefix].split(": ")[1]) : 0)
      ) {
        icons[prefix] = Assets.printimage({
          key: effectName,
          tooltip_override: `${prefix}: ${effectValue}`,
          css_class_override: `CRABS_status-icon`,
          css_style: `--brightness: brightness(2.5);
          background: linear-gradient(to right, #202020 10%, var(--border-color, white) 80%, transparent 100%);
          `,
        });
      }
    }
  };

  for (let effect of effects) {
    for (let prefix of prefixes) {
      if (effect.startsWith(prefix)) {
        updateIcon(prefix, effect);
      }
    }
  }

  icons.Blind =
    icons.Blind ||
    Assets.printimage({
      key: "blindNone",
      css_class_override: "CRABS_status-icon",
    });
  icons.Gag =
    icons.Gag ||
    Assets.printimage({
      key: "gagNone",
      css_class_override: "CRABS_status-icon",
    });
  icons.Deaf =
    icons.Deaf ||
    Assets.printimage({
      key: "deafNone",
      css_class_override: "CRABS_status-icon",
    });

  return `${icons.Gag} ${icons.Blind} ${icons.Deaf}`;
}

/**
 * Determines the room badge for a player (Admin, VIP, or Guest).
 * @param {Character} character - The character to check.
 * @returns {string} HTML string representing the badge icon.
 */
export function setbadge(character: any): string {
  const memberNum = character.MemberNumber ?? -1;
  const chatRoomData = (window as any).ChatRoomData;
  let badge = Assets.printimage({ key: "player" });

  if (!chatRoomData) {
    return badge;
  }

  const isVip =
    Array.isArray(chatRoomData.Whitelist) &&
    chatRoomData.Whitelist.includes(memberNum);
  const isAdmin =
    Array.isArray(chatRoomData.Admin) && chatRoomData.Admin.includes(memberNum);

  if (isAdmin) {
    badge = Assets.printimage({ key: "admin" });
  } else if (isVip) {
    badge = Assets.printimage({ key: "vip" });
  }

  return badge;
}

/**
 * Determines and generates relational icons for a player (Owner, Friend, Whitelisted, etc.).
 * @param {Character} character - The character object.
 * @returns {string} HTML string containing the relevant relational icons.
 */
export function setIcons(character: any): string {
  if (character.IsPlayer()) {
    return Assets.printimage({ key: "you" }) + " ";
  }

  let playerIcons = "";
  const memberNum = character.MemberNumber ?? -1;
  const playerWindow = (window as any).Player;

  const isTrial =
    character.Ownership?.MemberNumber === playerWindow.MemberNumber &&
    character.Ownership?.Stage === 0;

  if (playerWindow.OwnerNumber() === memberNum) {
    playerIcons += Assets.printimage({ key: "owner" }) + " ";
  } else if (character.IsOwnedByPlayer()) {
    if (isTrial) {
      playerIcons += Assets.printimage({ key: "trial" }) + " ";
    } else {
      playerIcons += Assets.printimage({ key: "sub" }) + " ";
    }
  } else if (playerWindow.IsInFamilyOfMemberNumber(memberNum)) {
    playerIcons += Assets.printimage({ key: "family" }) + " ";
  }

  if (playerWindow.GetLoversNumbers().includes(memberNum)) {
    playerIcons += Assets.printimage({ key: "lover" }) + " ";
  } else {
    if (CrossMod.detectMod("BCTweaks")) {
      if (playerWindow.BCT?.bctSettings?.bestFriendsList?.includes(memberNum)) {
        playerIcons += Assets.printimage({ key: "bestfriend" }) + " ";
      } else if (playerWindow.FriendList.includes(memberNum)) {
        playerIcons += Assets.printimage({ key: "friend" }) + " ";
      }
    } else if (playerWindow.FriendList.includes(memberNum)) {
      playerIcons += Assets.printimage({ key: "friend" }) + " ";
    }
  }

  if (playerWindow.WhiteList.includes(memberNum)) {
    playerIcons += Assets.printimage({ key: "whitelist" }) + " ";
  } else if (playerWindow.BlackList.includes(memberNum)) {
    playerIcons += Assets.printimage({ key: "blacklist" }) + " ";
  }

  if (playerWindow.GhostList.includes(memberNum)) {
    playerIcons += Assets.printimage({ key: "ghost" }) + " ";
  }

  return playerIcons;
}
