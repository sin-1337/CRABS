/**
 * CRABS Keybindings Module
 *
 * Integrates CRABS shortcut actions with Bondage Club's KeyManager engine.
 *
 * @module base/keybinds
 */

import { translate } from "./localization";

/**
 * Registers an interactive keybinding with the host game's KeyManager.
 *
 * @param id - Unique binding identifier.
 * @param actionName - Display name of the action.
 * @param description - Detailed description shown in hotkey settings.
 * @param key - Default primary key string.
 * @param actionCallback - Handler invoked when key combination triggers.
 * @param modifiers - Modifier key set (default: Ctrl + Alt).
 */
export function registerKeybind(
  id: string,
  actionName: string,
  description: string,
  key: string,
  actionCallback: () => boolean,
  modifiers: Set<string> = new Set(["Ctrl", "Alt"]),
): void {
  const globalWindow = window as any;
  if (
    !globalWindow.KeyManager ||
    !globalWindow.KeyManager.getContext("always")
  ) {
    setTimeout(
      () =>
        registerKeybind(
          id,
          actionName,
          description,
          key,
          actionCallback,
          modifiers,
        ),
      500,
    );
    return;
  }

  if (!globalWindow.KeyManager.getCategory("crabs")) {
    globalWindow.KeyManager.registerCategory({
      id: "crabs",
      name: { EN: translate("base.keybinds.category") },
    });
  }

  const actionWrapper = () => actionCallback();
  Object.defineProperty(actionWrapper, "name", {
    value: { EN: actionName },
    configurable: true,
    writable: true,
  });

  globalWindow.KeyManager.registerKeybinding({
    id: id,
    name: { EN: actionName },
    action: () => actionCallback(),
    description: { EN: description },
    contextIds: [],
    categoryId: "crabs",
    readonly: false,
    defaultKeyCombo: { key: key, modifiers: modifiers },
  });
}
