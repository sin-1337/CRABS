import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

export class PrivacyMode extends CRABS_Base {
  private isVisible: boolean = false;
  private isSuspended: boolean = false;
  private currentMode: "left" | "full" | null = null;
  private overlay: HTMLDivElement;
  private monitorTimer: number | null = null;

  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
    this.overlay = document.createElement("div");
    this.overlay.id = "CRABS-privacy-overlay";
    this.overlay.style.display = "none";
    this.overlay.style.position = "fixed";
    this.overlay.style.top = "0";
    this.overlay.style.left = "0";
    this.overlay.style.bottom = "0";
    this.overlay.style.backgroundColor = "black";
    this.overlay.style.zIndex = "999999";
    this.overlay.style.pointerEvents = "none"; // Prevents intercepting key and mouse events
    document.body.appendChild(this.overlay);

    // Half Mode Keybind (Ctrl + Alt + B)
    CRABS_Base.registerKeybind(
      "crabs_privacy_half",
      "Privacy Mode (Half)",
      "Blanks out the left side (canvas) of the chat room.",
      "KeyB",
      () => {
        this.toggle("left");
        return true;
      },
      { ctrl: true, alt: true, shift: false },
    );

    // Full Mode Keybind (Ctrl + Alt + Shift + B)
    CRABS_Base.registerKeybind(
      "crabs_privacy_full",
      "Privacy Mode (Full)",
      "Blanks out the entire screen.",
      "KeyB",
      () => {
        this.toggle("full");
        return true;
      },
      { ctrl: true, alt: true, shift: true },
    );

    this.registerNativeKeybind();
  }

  private registerNativeKeybind() {
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

    // Native Half Mode (Ctrl + Alt + B)
    const halfAction = () => {
      this.toggle("left");
      return true;
    };
    Object.defineProperty(halfAction, "name", {
      value: { EN: "Toggle Privacy Mode (Half)" },
    });

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
        modifiers: new Set(["Control", "Alt"]),
      },
    });

    // Native Full Mode (Ctrl + Alt + Shift + B)
    const fullAction = () => {
      this.toggle("full");
      return true;
    };
    Object.defineProperty(fullAction, "name", {
      value: { EN: "Toggle Privacy Mode (Full)" },
    });

    globalWindow.KeyManager.registerKeybinding({
      id: "crabs_privacy_full",
      action: fullAction,
      description: { EN: "Blanks out the entire screen." },
      contextIds: [],
      categoryId: "crabs",
      readonly: false,
      defaultKeyCombo: {
        key: "KeyB",
        modifiers: new Set(["Control", "Shift", "Alt"]),
      },
    });
  }

  public toggle(mode: "left" | "full"): void {
    const active = this.isVisible || this.isSuspended;

    // Toggle off if currently active in the exact same mode
    if (active && this.currentMode === mode) {
      this.isVisible = false;
      this.isSuspended = false;
      this.currentMode = null;
      this.overlay.style.display = "none";
      this.stopMonitoring();
      return;
    }

    // Activate or switch mode
    this.currentMode = mode;
    const globalWindow = window as any;
    const inMainChat =
      globalWindow.CurrentScreen === "ChatRoom" &&
      globalWindow.CurrentCharacter === null;

    if (mode === "left") {
      this.overlay.style.width = "50vw";

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
      // Full screen mode
      this.isSuspended = false;
      this.isVisible = true;
      this.overlay.style.width = "100vw";
      this.overlay.style.display = "block";
      this.stopMonitoring();
    }
  }

  // --- SCREEN TRACKING ---

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
      } else if (inMainChat && this.isSuspended) {
        this.isSuspended = false;
        this.isVisible = true;
        this.overlay.style.display = "block";
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
