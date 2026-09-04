import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/privacy.css";
import * as locales from "./i18n";

export class PrivacyMode extends CRABS_Base {
  private isVisible: boolean = false;
  private isSuspended: boolean = false;
  private currentMode: "left" | "full" | null = null;
  private overlay: HTMLDivElement;
  private monitorTimer: number | null = null;

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
   * Hooks into the game's notification updater to suppress
   * and replace the title while Privacy Mode is active.
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
   * Forces the game to immediately evaluate NotificationTitleUpdate.
   */
  private syncTitle(): void {
    const globalWindow = window as any;
    if (typeof globalWindow.NotificationTitleUpdate === "function") {
      globalWindow.NotificationTitleUpdate();
    } else if (this.isVisible) {
      document.title = this.t("window.title") || "Blank.html";
    }
  }

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

  private stopMonitoring(): void {
    if (this.monitorTimer !== null) {
      window.clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }
}
