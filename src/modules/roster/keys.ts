/**
 * CRABS Map Keys Module
 *
 * State evaluation, inventory extraction, tile discard action dispatching,
 * header icon rendering, and drawer page view compilation for map keys.
 *
 * @module keys
 */

import { Assets } from "../base";
import keysPageTemplate from "./templates/roster_keys.html";
import keyCardTemplate from "./templates/roster_keys_card.html";

/**
 * Evaluates and returns the current map key possession state for the local player.
 *
 * @returns Active key possession flags.
 */
export function getKeyState(): KeyState {
  const pState = (window as any).Player?.MapData?.PrivateState;
  const hasBronze = !!pState?.HasKeyBronze;
  const hasSilver = !!pState?.HasKeySilver;
  const hasGold = !!pState?.HasKeyGold;

  return {
    hasBronze,
    hasSilver,
    hasGold,
    hasAny: hasBronze || hasSilver || hasGold,
    keyStateString: `${hasBronze ? 1 : 0}${hasSilver ? 1 : 0}${hasGold ? 1 : 0}`,
  };
}

/**
 * Drops one or all map keys held by the local player on the current map tile,
 * mutates private state flags, triggers server sync, and prints localized room feedback.
 *
 * @param target - Specific key tier to drop, or "all".
 * @param translate - Localization lookup function.
 * @returns True if at least one key state was successfully cleared.
 */
export function dropMapKey(
  target: DropTarget,
  translate: (key: string, params?: Record<string, string | number>) => string,
): boolean {
  const globalWindow = window as any;

  if (
    typeof globalWindow.ChatRoomMapViewIsActive !== "function" ||
    !globalWindow.ChatRoomMapViewIsActive()
  ) {
    globalWindow.ChatRoomSendLocal?.(translate("dropkeys_not_map"));
    return false;
  }

  const player = globalWindow.Player;
  const pState = player?.MapData?.PrivateState;
  const cleanTarget = String(target || "")
    .toLowerCase()
    .trim();
  if (!pState) return false;

  let droppedAny = false;

  const tryDrop = (
    keyProp: "HasKeyBronze" | "HasKeySilver" | "HasKeyGold",
    colorName: string,
  ) => {
    if (pState[keyProp]) {
      pState[keyProp] = false;
      droppedAny = true;
      globalWindow.ChatRoomSendLocal?.(
        translate("dropkeys_dropped", {
          color: translate(`keys.${colorName}`),
        }),
      );
    }
  };

  if (cleanTarget === "bronze" || cleanTarget === "all")
    tryDrop("HasKeyBronze", "bronze");
  if (cleanTarget === "silver" || cleanTarget === "all")
    tryDrop("HasKeySilver", "silver");
  if (cleanTarget === "gold" || cleanTarget === "all")
    tryDrop("HasKeyGold", "gold");

  if (droppedAny) {
    // Synchronize character map data with the room/server
    if (typeof globalWindow.ChatRoomMapViewSendPrivateState === "function") {
      globalWindow.ChatRoomMapViewSendPrivateState();
    } else if (typeof globalWindow.ServerSend === "function") {
      globalWindow.ServerSend("ChatRoomChat", {
        Type: "MapData",
        Content: "PrivateState",
        Dictionary: [{ MapDataPrivateState: pState }],
      });
    }
  }

  return droppedAny;
}

/**
 * Generates the header icon HTML markup representing held and empty key slots.
 *
 * @param isMap - Whether map view mode is currently active in the room.
 * @returns HTML string containing key icons, or empty string if not in a map room.
 */
export function renderHeaderKeys(isMap: boolean): string {
  if (!isMap) return "";

  const state = getKeyState();
  const KEYS = [
    { key: "keyBronze", held: state.hasBronze },
    { key: "keySilver", held: state.hasSilver },
    { key: "keyGold", held: state.hasGold },
  ];

  let iconsHtml = "";
  for (const item of KEYS) {
    iconsHtml += Assets.printimage({
      key: item.held ? (item.key as any) : "keyNull",
    });
  }

  return iconsHtml;
}

/**
 * Builds the dedicated Keys management page HTML to mount inside the roster drawer
 * using imported HTML templates.
 *
 * @param templateFn - Template rendering delegate.
 * @param translate - Localization lookup function.
 * @returns Rendered drawer view HTML string.
 */
export function buildKeysRoster(
  templateFn: (
    template: string,
    args: Record<string, string>,
    wrapper: boolean,
  ) => string,
  translate: (key: string, params?: Record<string, string | number>) => string,
): string {
  const state = getKeyState();

  // If no keys held, reuse roster_keys.html with an empty placeholder inside {{Cards}}
  if (!state.hasAny) {
    return templateFn(
      keysPageTemplate,
      {
        Prompt: "",
        Cards: `<div style="text-align: center; padding: 40px 20px; color: #888;">${translate("keys.no_keys_held")}</div>`,
        DropAllDisplay: "none",
      },
      false,
    );
  }

  const heldList: Array<{ id: KeysType; label: string; asset: string }> = [];
  if (state.hasBronze)
    heldList.push({
      id: "bronze",
      label: translate("keys.bronze"),
      asset: "keyBronze",
    });
  if (state.hasSilver)
    heldList.push({
      id: "silver",
      label: translate("keys.silver"),
      asset: "keySilver",
    });
  if (state.hasGold)
    heldList.push({
      id: "gold",
      label: translate("keys.gold"),
      asset: "keyGold",
    });

  let cardsHtml = "";
  for (const item of heldList) {
    const icon = Assets.printimage({
      key: item.asset as any,
      css_class_override: "CRABS_key_drop_icon",
    });

    cardsHtml += templateFn(
      keyCardTemplate,
      {
        KeyIcon: icon,
        KeyLabel: item.label,
        KeyType: item.id,
        DropButtonLabel: translate("keys.drop_specific", { color: item.label }),
      },
      false,
    );
  }

  return templateFn(
    keysPageTemplate,
    {
      Prompt: translate("keys.dialog_prompt"),
      Cards: cardsHtml,
      DropAllDisplay: heldList.length > 1 ? "flex" : "none",
    },
    false,
  );
}
