import { Assets } from "../assets";

export type KeyType = "bronze" | "silver" | "gold";
export type DropTarget = KeyType | "all";

export interface KeyState {
  hasBronze: boolean;
  hasSilver: boolean;
  hasGold: boolean;
  hasAny: boolean;
}

/**
 * Returns current map key possession state for the local player.
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
  };
}

/**
 * Drops one or all map keys currently held by the local player.
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

  const pState = globalWindow.Player?.MapData?.PrivateState;
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

  if (target === "bronze" || target === "all")
    tryDrop("HasKeyBronze", "bronze");
  if (target === "silver" || target === "all")
    tryDrop("HasKeySilver", "silver");
  if (target === "gold" || target === "all") tryDrop("HasKeyGold", "gold");

  return droppedAny;
}

/**
 * Generates the header HTML string for map keys.
 */
export function renderHeaderKeys(
  isMap: boolean,
  translate: (key: string, params?: Record<string, string | number>) => string,
): string {
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

  if (state.hasAny) {
    return `<span class="CRABS_keys_trigger" style="cursor: pointer;" title="${translate("tooltips.manage_keys")}">${iconsHtml}</span>`;
  }

  return iconsHtml;
}

/**
 * Builds the wrapped dialog HTML for dropping keys.
 */
export function buildKeyDropDialogHtml(
  templateFn: (
    template: string,
    args: Record<string, string>,
    wrapper: boolean,
    wrapperArgs?: Record<string, string>,
  ) => string,
  translate: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  const state = getKeyState();
  if (!state.hasAny) {
    (window as any).ChatRoomSendLocal?.(translate("dropkeys_no_keys_held"));
    return null;
  }

  const heldList: Array<{ id: KeyType; label: string }> = [];
  if (state.hasBronze)
    heldList.push({ id: "bronze", label: translate("keys.bronze") });
  if (state.hasSilver)
    heldList.push({ id: "silver", label: translate("keys.silver") });
  if (state.hasGold)
    heldList.push({ id: "gold", label: translate("keys.gold") });

  let buttonsHtml = "";
  for (const item of heldList) {
    buttonsHtml += `
      <button class="CRABS_btn CRABS_drop_key_btn" data-key="${item.id}" style="padding: 6px 12px; cursor: pointer;">
        ${translate("keys.drop_specific", { color: item.label })}
      </button>`;
  }

  if (heldList.length > 1) {
    buttonsHtml += `
      <button class="CRABS_btn CRABS_drop_key_btn" data-key="all" style="padding: 6px 12px; cursor: pointer;">
        ${translate("keys.drop_all")}
      </button>`;
  }

  const innerTemplate = `
    <div class="CRABS_key_drop_dialog" style="padding: 12px; text-align: center;">
      <p style="margin-bottom: 14px;">{{Prompt}}</p>
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        {{KeyButtons}}
      </div>
    </div>`;

  return templateFn(
    innerTemplate,
    {
      Prompt: translate("keys.dialog_prompt"),
      KeyButtons: buttonsHtml,
    },
    true,
    {
      TitleBar: translate("keys.dialog_title"),
      Close: Assets.printimage({
        key: "close",
        tooltip_override: translate("controls.close_dialog"),
        data: ["elementid", "CRABS_KeyDropDialog"],
      }),
    },
  );
}
