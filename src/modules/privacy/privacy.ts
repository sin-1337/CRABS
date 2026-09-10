/**
 * CRABS Privacy Module
 *
 * Screen-masking and window disguise utilities for Bondage Club.
 * Provides split-canvas masking, full-screen blanking, native hotkey bindings,
 * and browser tab title spoofing.
 *
 * @module privacy
 */

import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/privacy.css";
import locales from "./i18n.json";

/**
 * Controller for visual privacy masking and tab disguise modes.
 *
 * Manages an overlay element that can either mask just the canvas room view
 * ("left") or cover the entire viewport ("full"). Automatically monitors room
 * subscreen transitions (such as inspecting a character) to suspend/resume half-mode,
 * and hooks the notification system to spoof the browser tab title while active.
 */
export class PrivacyMode extends CRABS_Base {
  /** Indicates whether the privacy overlay is currently visible on screen. */
  private isVisible: boolean = false;

  /**
   * Indicates whether half-screen privacy mode is temporarily hidden due to
   * navigating into a character view or subscreen.
   */
  private isSuspended: boolean = false;

  /** Current active privacy masking mode, or `null` if disabled. */
  private currentMode: "left" | "full" | null = null;

  /** Injected DOM container used to render the masking layer. */
  private overlay: HTMLDivElement;

  /** Interval ID for the subscreen tracking watcher loop, or `null` if idle. */
  private monitorTimer: number | null = null;

  /**
   * Initializes the PrivacyMode module, creates and appends the masking overlay,
   * registers notification title hooks, and binds keyboard shortcuts.
   *
   * @param CRABS - Instantiated ModSDK API bridge.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "privacy", locales);
    this.overlay = document.createElement("div");
    this.overlay.id = "CRABS-privacy-overlay";
    document.body.appendChild(this.overlay);

    this.setupTitleHook();

    CRABS_Base.registerKeybind(
      "crabs_privacy_half",
      "Privacy Mode (Half)",
      "Blanks out the left side (canvas) of the chat room.",
      "KeyB",
      () => {
        this.toggle("left");
        return true;
      },
      new Set(["Ctrl", "Alt"]),
    );

    CRABS_Base.registerKeybind(
      "crabs_privacy_full",
      "Privacy Mode (Full)",
      "Blanks out the entire screen.",
      "KeyB",
      () => {
        this.toggle("full");
        return true;
      },
      new Set(["Ctrl", "Shift"]),
    );

    this.registerNativeKeybind();
  }

  /**
   * Hooks into the game's native `NotificationTitleUpdate` function.
   *
   * When Privacy Mode is visible, replaces the document title with a spoofed
   * string and suppresses base-game execution to prevent room/message leakage.
   *
   * @private
   */
  private setupTitleHook(): void {
    this.safeHook(
      "NotificationTitleUpdate",
      10,
      (args: any[], next: (args: any[]) => any) => {
        if (this.isVisible) {
          const spoofedTitle = this.t("window.title") || "Blank.html";
          if (document.title !== spoofedTitle) {
            document.title = spoofedTitle;
          }
          return null; // Suppresses native title update execution
        }
        return next(args);
      },
    );
  }

  /**
   * Registers shortcuts with the native Bondage Club `KeyManager` interface
   * once the key management subsystem is ready.
   *
   * @private
   */
  private registerNativeKeybind(): void {
    const globalWindow = window as any;

    if (
      !globalWindow.KeyManager ||
      !globalWindow.KeyManager.getContext("always")
    ) {
      setTimeout(() => this.registerNativeKeybind(), 500);
      return;
    }

    if (!globalWindow.KeyManager.getCategory("crabs")) {
      globalWindow.KeyManager.registerCategory({
        id: "crabs",
        name: { EN: "CRABS Mod" },
      });
    }

    const halfAction = () => {
      this.toggle("left");
      return true;
    };
    Object.defineProperty(halfAction, "name", {
      value: { EN: "Toggle Privacy Mode (Half)" },
    });

    if (!globalWindow.KeyManager.getKeybinding("crabs_privacy_half")) {
      globalWindow.KeyManager.registerKeybinding({
        id: "crabs_privacy_half",
        action: halfAction,
        description: {
          EN: "Blanks out the left side (canvas) of the chat room.",
        },
        contextIds: [],
        categoryId: "crabs",
        readonly: false,
        defaultKeyCombo: {
          key: "KeyB",
          modifiers: new Set(["Ctrl", "Alt"]),
        },
      });
    }

    const fullAction = () => {
      this.toggle("full");
      return true;
    };
    Object.defineProperty(fullAction, "name", {
      value: { EN: "Toggle Privacy Mode (Full)" },
    });

    if (!globalWindow.KeyManager.getKeybinding("crabs_privacy_full")) {
      globalWindow.KeyManager.registerKeybinding({
        id: "crabs_privacy_full",
        action: fullAction,
        description: { EN: "Blanks out the entire screen." },
        contextIds: [],
        categoryId: "crabs",
        readonly: false,
        defaultKeyCombo: {
          key: "KeyB",
          modifiers: new Set(["Ctrl", "Shift", "Alt"]),
        },
      });
    }
  }

  /**
   * Toggles the privacy mask between off and the requested mode.
   *
   * If the requested mode is already active, disables the overlay. In `"left"`
   * mode, monitors main chat presence and hides the overlay if a character is
   * currently focused. In `"full"` mode, unconditionally blanks the screen.
   *
   * @param mode - Masking scope to toggle (`"left"` for canvas only, `"full"` for entire window).
   */
  public toggle(mode: "left" | "full"): void {
    if ((this.isVisible || this.isSuspended) && this.currentMode === mode) {
      this.isVisible = false;
      this.isSuspended = false;
      this.currentMode = null;
      this.overlay.style.display = "none";
      this.overlay.removeAttribute("data-mode");
      this.stopMonitoring();
      this.syncTitle();
      return;
    }

    this.currentMode = mode;
    const globalWindow = window as any;
    const inMainChat =
      globalWindow.CurrentScreen === "ChatRoom" &&
      globalWindow.CurrentCharacter === null;

    this.overlay.setAttribute("data-mode", mode);

    if (mode === "left") {
      if (!inMainChat) {
        this.isVisible = false;
        this.isSuspended = true;
        this.overlay.style.display = "none";
      } else {
        this.isSuspended = false;
        this.isVisible = true;
        this.overlay.style.display = "block";
      }
      this.startMonitoring();
    } else {
      this.isSuspended = false;
      this.isVisible = true;
      this.overlay.style.display = "block";
      this.stopMonitoring();
    }

    this.syncTitle();
  }

  /**
   * Triggers the native notification title update pipeline or directly applies
   * the spoofed title string to reflect current visibility.
   *
   * @private
   */
  private syncTitle(): void {
    const globalWindow = window as any;
    if (typeof globalWindow.NotificationTitleUpdate === "function") {
      globalWindow.NotificationTitleUpdate();
    } else if (this.isVisible) {
      document.title = this.t("window.title") || "Blank.html";
    }
  }

  /**
   * Starts a polling timer to monitor whether the player navigates away from
   * the main chat view (e.g. into an item or profile inspection screen) during `"left"` mode,
   * suspending and restoring the mask as appropriate.
   *
   * @private
   */
  private startMonitoring(): void {
    this.stopMonitoring();

    this.monitorTimer = window.setInterval(() => {
      if (this.currentMode !== "left") return;

      const globalWindow = window as any;
      const inMainChat =
        globalWindow.CurrentScreen === "ChatRoom" &&
        globalWindow.CurrentCharacter === null;

      if (!inMainChat && this.isVisible) {
        this.isVisible = false;
        this.isSuspended = true;
        this.overlay.style.display = "none";
        this.syncTitle();
      } else if (inMainChat && this.isSuspended) {
        this.isSuspended = false;
        this.isVisible = true;
        this.overlay.style.display = "block";
        this.syncTitle();
      }
    }, 200);
  }

  /**
   * Stops and clears the subscreen monitoring interval timer.
   *
   * @private
   */
  private stopMonitoring(): void {
    if (this.monitorTimer !== null) {
      window.clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }
}
