/**
 * CRABS Drawer Module
 *
 * This module implements the sliding drawer interface for the CRABS mod.
 * It provides:
 * - A persistent UI container for the roster and help screens
 * - Automatic visibility management based on game state
 * - Integration with the game's chat log dimensions
 * - Event handling for navigation and interaction
 * - Event-driven rendering via a decentralized registration model
 *
 * Hardened against runtime delegate exceptions, null DOM queries,
 * and unsafe global variable scoping.
 */

import { CRABS_Base, PerformanceLevel } from "./core";
import { Notification } from "../notifications/notifications";
import { translate } from "./localization";
import { registerKeybind } from "./keybinds";
import { Assets } from "./assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/drawer.css";
import drawertemplate from "./templates/drawer.html";
import type {
  DrawerPage,
  DrawerViewDefinition,
  DrawerStateDelegate,
  DrawerUIInjector,
} from "./types";

export type {
  DrawerPage,
  DrawerViewDefinition,
  DrawerStateDelegate,
  DrawerUIInjector,
};

/**
 * Class representing the side drawer UI.
 * Manages the sliding panel container and dispatches views via registered providers.
 * Implements a Singleton pattern for global access via static methods.
 * @extends CRABS_Base
 */
export class Drawer extends CRABS_Base {
  /** Singleton instance of the Drawer. */
  private static _instance: Drawer | null = null;
  /** Current visual state of the drawer. */
  private isOpen: boolean = false;
  /** The primary DOM element containing the drawer. */
  private instance: HTMLElement | null = null;

  /** Registered views mapped by page ID. */
  private static registeredViews = new Map<DrawerPage, DrawerViewDefinition>();
  /** Registered auxiliary UI injectors (e.g. WhisperPlus). */
  private static registeredInjectors = new Set<DrawerUIInjector>();
  /** Registered state delegate (e.g. Roster). */
  private static stateDelegate: DrawerStateDelegate | null = null;

  /** Observer to keep the drawer aligned with the chat log resizing. */
  private resizeObserver: ResizeObserver | null = null;
  /** Tracks active page view inside the drawer. Defaults to "roster". */
  private activePage: DrawerPage = "roster";

  /** Counter used to throttle frame updates based on performance tier. */
  private updateTick: number = 0;
  /** Tracks the previous key inventory bitstring to detect pickups/drops immediately. */
  private lastKnownKeys: string = "";
  /** Tracks whether the map was active on the previous update cycle. */
  private wasMapActive: boolean = false;
  /** Cached reference to the tab element to prevent DOM queries in the render loop. */
  private tabElement: HTMLElement | null = null;
  /** Cached reference to the chat log element. */
  private chatLogElement: HTMLElement | null = null;
  /** Tracks the last known performance state to trigger visual swaps. */
  private lastPerfLevel: PerformanceLevel = PerformanceLevel.NORMAL;

  /**
   * Initializes the Drawer module and sets up the Singleton instance.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "drawer");
    Drawer._instance = this;

    registerKeybind(
      "crabs_drawer_toggle",
      this.t("drawer.keybinds.toggle_name"),
      this.t("drawer.keybinds.toggle_desc"),
      "KeyD",
      () => {
        this.toggle();
        return true;
      },
    );

    this.init();
  }

  // ─────────────────────────────────────────────────────────────
  // Registration API (One-way Consumer Pattern)
  // ─────────────────────────────────────────────────────────────

  public static registerView(viewDef: DrawerViewDefinition): void {
    Drawer.registeredViews.set(viewDef.id, viewDef);
  }

  public static registerUIInjector(injector: DrawerUIInjector): void {
    Drawer.registeredInjectors.add(injector);
  }

  public static registerStateDelegate(delegate: DrawerStateDelegate): void {
    Drawer.stateDelegate = delegate;
  }

  // ─────────────────────────────────────────────────────────────
  // Static Control Facades
  // ─────────────────────────────────────────────────────────────

  public static toggle(page?: DrawerPage): void {
    Drawer._instance?.toggle(page);
  }

  public static open(page?: DrawerPage): void {
    Drawer.updateVisibility();
    Drawer._instance?.open(page);
  }

  public static close(): void {
    Drawer._instance?.close();
  }

  public static updateVisibility(): void {
    Drawer._instance?.updateVisibility();
  }

  public static refresh(): void {
    Drawer._instance?.refresh();
  }

  public static isShowingHelp(): boolean {
    return Drawer._instance?.activePage === "help";
  }

  public static setShowingHelp(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.activePage = value ? "help" : "roster";
    }
  }

  public static isShowingKeys(): boolean {
    return Drawer._instance?.activePage === "keys";
  }

  public static setShowingKeys(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.activePage = value ? "keys" : "roster";
    }
  }

  public static isShowingHistory(): boolean {
    return Drawer._instance?.activePage === "history";
  }

  public static setShowingHistory(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.activePage = value ? "history" : "roster";
    }
  }

  public static RaveTab(): void {
    Drawer._instance?.RaveTab();
  }

  private lastRect = {
    top: -1,
    width: -1,
    height: -1,
    right: -1,
    compact: false,
  };

  private getLayoutIconKey(): string {
    const layout = Drawer.stateDelegate?.layoutMode
      ? Drawer.stateDelegate.layoutMode()
      : "layout-grid";
    switch (layout) {
      case "layout-mobile-stack":
        return "menu_rows";
      case "layout-compact":
        return "menu_rows_compressed";
      case "layout-grid":
      default:
        return "menu_cards";
    }
  }

  public RaveTab(): void {
    if (!this.instance) return;
    const tab = this.instance.querySelector("#drawer-tab") as HTMLElement;
    if (!tab) return;

    tab.innerHTML = Assets.printimage({ key: "rave" });
    tab.setAttribute("data-mode", "rave");

    setTimeout(() => {
      if (!tab) return;
      tab.removeAttribute("data-mode");

      const isLow =
        CRABS_Base.currentPerformanceLevel !== PerformanceLevel.NORMAL;
      this.optimizeVisuals(isLow);
    }, 10000);
  }

  private init(): void {
    if (document.body) {
      this.setupElement();
    } else {
      document.addEventListener("DOMContentLoaded", () => this.setupElement());
    }

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          const globalWindow = window as any;
          const currentChar = globalWindow.CurrentCharacter;
          const dialogLeaveFunc = globalWindow.DialogLeave;

          if (currentChar !== null && typeof dialogLeaveFunc === "function") {
            dialogLeaveFunc();
            if (this.isOpen) {
              this.close();
            }
          } else if (this.isOpen) {
            this.close();
          }
        }
      },
      true,
    );

    this.setupDynamicUpdates();
  }

  private getSetting<T>(key: string, defaultValue: T): T {
    const globalWindow = window as any;
    const settingsInstanceData = (globalWindow.CRABS?.Settings as any)?.instance
      ?.data;
    const val =
      globalWindow.CRABS_Settings?.[key] ??
      settingsInstanceData?.[key] ??
      globalWindow.CRABS?.Settings?.[key];
    return val !== undefined ? val : defaultValue;
  }

  private optimizeVisuals(lowPerformance: boolean): void {
    if (!this.instance || !this.tabElement) return;

    const currentMode = this.tabElement.getAttribute("data-mode");
    if (currentMode === "rave") return;

    const animatedLogo = this.getSetting<boolean>("animatedCrabsLogo", true);
    const targetMode = !lowPerformance && animatedLogo ? "animated" : "static";

    if (currentMode !== targetMode) {
      const iconKey = targetMode === "animated" ? "animated_logo" : "logo";
      this.tabElement.innerHTML = Assets.printimage({ key: iconKey });
      this.tabElement.setAttribute("data-mode", targetMode);
    }

    const rootElement = this.instance;
    if (lowPerformance && !rootElement.classList.contains("CRABS_perf_low")) {
      rootElement.classList.add("CRABS_perf_low");
      document.documentElement.style.setProperty("--crabs-blur", "3px");
    } else if (
      !lowPerformance &&
      rootElement.classList.contains("CRABS_perf_low")
    ) {
      rootElement.classList.remove("CRABS_perf_low");
      document.documentElement.style.setProperty("--crabs-blur", "10px");
    }
  }

  private setupDynamicUpdates(): void {
    this.safeHook(
      "TranslationLoad",
      12,
      (args: any, next: (args: any[]) => any) => {
        const result = next(args);
        if (this.instance) {
          this.refresh();
        }
        return result;
      },
    );

    this.safeHook(
      "ChatRoomRun",
      15,
      (functionArguments: any, next: (args: any[]) => any) => {
        const result = next(functionArguments);

        const currentPerf = CRABS_Base.currentPerformanceLevel;
        const isLowPerformance = currentPerf !== PerformanceLevel.NORMAL;

        const animatedLogo = this.getSetting<boolean>(
          "animatedCrabsLogo",
          true,
        );
        const expectedMode =
          !isLowPerformance && animatedLogo ? "animated" : "static";
        const actualMode = this.tabElement?.getAttribute("data-mode");

        if (
          this.lastPerfLevel !== currentPerf ||
          (actualMode !== "rave" && actualMode !== expectedMode)
        ) {
          this.optimizeVisuals(isLowPerformance);
          this.lastPerfLevel = currentPerf;
        }

        let threshold = 5;
        if (currentPerf === PerformanceLevel.LOW) {
          threshold = 30;
        } else if (currentPerf === PerformanceLevel.CRITICAL) {
          threshold = 120;
        }

        this.updateTick++;
        if (this.updateTick >= threshold) {
          this.updateTick = 0;

          this.updateVisibility();

          let isMapActive = false;
          try {
            isMapActive = Boolean(this.isMap());
          } catch {
            isMapActive = false;
          }

          if (this.wasMapActive && !isMapActive) {
            if (this.activePage === "keys") {
              this.activePage = "roster";
              this.refresh();
            }
          }
          this.wasMapActive = isMapActive;

          if (
            this.isOpen &&
            isMapActive &&
            this.activePage !== "help" &&
            this.activePage !== "history"
          ) {
            try {
              const currentKeys = Drawer.stateDelegate?.getKeyStateString
                ? Drawer.stateDelegate.getKeyStateString()
                : "";
              if (currentKeys && this.lastKnownKeys !== currentKeys) {
                this.lastKnownKeys = currentKeys;

                if (this.activePage === "keys") {
                  this.refresh();
                } else if (this.instance && Drawer.stateDelegate?.updateUI) {
                  Drawer.stateDelegate.updateUI(this.instance);
                }
              }
            } catch (delegateErr) {
              console.error(
                "[CRABS Drawer] Error polling key state from delegate:",
                delegateErr,
              );
            }
          }

          if (this.isOpen && this.activePage !== "help") {
            try {
              if (
                Drawer.stateDelegate?.isDirty &&
                Drawer.stateDelegate.isDirty()
              ) {
                if (
                  this.activePage === "history" ||
                  this.activePage === "keys"
                ) {
                  this.refresh();
                } else {
                  const rosterRoot = this.instance?.querySelector(
                    ".CRABS_roster_center_table",
                  ) as HTMLElement;

                  if (rosterRoot && Drawer.stateDelegate?.updateUI) {
                    Drawer.stateDelegate.updateUI(this.instance!);
                  } else {
                    this.refresh();
                  }
                }

                Drawer.stateDelegate?.clearDirty?.();
              }
            } catch (dirtyErr) {
              console.error(
                "[CRABS Drawer] Error processing drawer dirty update:",
                dirtyErr,
              );
            }
          }
        }
        return result;
      },
    );
  }

  private setupElement(): void {
    if (this.instance) return;

    try {
      const globalWindow = window as any;
      const chatRoomData = globalWindow.ChatRoomData;

      const roomName =
        chatRoomData?.Name || this.t("drawer.header.title_default");
      const title = `${roomName}`;

      const animatedLogo = this.getSetting<boolean>("animatedCrabsLogo", true);
      const logoKey = animatedLogo ? "animated_logo" : "static_logo";

      const templateVars = {
        Help: Assets.printimage({
          key: "help",
          css_class_override: "CRABS_Drawer_Help_Icon",
        }),
        Settings: Assets.printimage({
          key: "settings",
          css_class_override: "CRABS_Drawer_Settings_Icon",
        }),
        Layout: Assets.printimage({
          key: this.getLayoutIconKey() as any,
          css_class_override: "CRABS_Drawer_Layout_Icon",
        }),
        History: Assets.printimage({
          key: "history" as any,
          css_class_override: "CRABS_Drawer_History_Icon",
        }),
        TabIcon: Assets.printimage({
          key: logoKey,
        }),
        SortIcon: Assets.printimage({
          key: "sort",
          tooltip_override: this.t("drawer.tooltips.layout"),
          css_class_override: "CRABS_Drawer_Sort_Icon",
        }),
        TitleBar: title,
        Close: Assets.printimage({
          key: "close",
          css_class_override: "CRABS_Drawer_Close_Icon",
        }),
      };

      const html = this.template(drawertemplate, templateVars, false);
      const container = document.createElement("div");
      container.innerHTML = html;
      const element = container.firstElementChild as HTMLElement;

      if (element) {
        element.classList.add("drawer-closed");
        document.body.appendChild(element);
        this.instance = element;

        this.tabElement = element.querySelector("#drawer-tab") as HTMLElement;
        this.chatLogElement = document.getElementById("TextAreaChatLog");

        this.bindEvents();
        this.updateVisibility();
      }
    } catch (err) {
      console.error("[CRABS Drawer] FATAL: Failed to inject Drawer DOM:", err);
    }
  }

  private syncToChat(): void {
    if (!this.chatLogElement) {
      this.chatLogElement = document.getElementById("TextAreaChatLog");
    }

    const chatLog = this.chatLogElement;
    if (!chatLog || !this.instance) return;

    const rect = chatLog.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const rightOffset = document.documentElement.clientWidth - rect.right;
    const compact = this.getSetting<boolean>("compactDrawer", false);

    if (
      this.lastRect.top !== rect.top ||
      this.lastRect.width !== rect.width ||
      this.lastRect.height !== rect.height ||
      this.lastRect.right !== rightOffset ||
      this.lastRect.compact !== compact
    ) {
      this.instance.style.top = `${rect.top}px`;
      this.instance.style.width = `${rect.width}px`;
      this.instance.style.height = compact
        ? `${rect.height * 0.77}px`
        : `${rect.height}px`;
      this.instance.style.right = `${rightOffset}px`;

      this.lastRect = {
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rightOffset,
        compact,
      };
    }
  }

  /**
   * Determines whether the drawer should be visible.
   * Strictly restricts display to the primary ChatRoom screen and hides it on
   * Wardrobe (Appearance), Room Admin, Settings, or when focusing another character.
   */
  public updateVisibility(): void {
    if (!this.instance) {
      this.setupElement();
      if (!this.instance) return;
    }

    const enableDrawer = this.getSetting<boolean>("enableDrawer", true);
    if (!enableDrawer) {
      this.instance.style.display = "none";
      this.close();
      return;
    }

    const globalWindow = window as any;
    const currentScreen = globalWindow.CurrentScreen;

    // Strict Screen Constraint: The drawer must ONLY exist on the main room screen (tile map or standard)
    const isStrictChatRoom = currentScreen === "ChatRoom";

    // Player Focus Check: Dialog with another character opens over the room
    const isFocused =
      globalWindow.CurrentCharacter !== null &&
      typeof globalWindow.CurrentCharacter !== "undefined";

    if (!isStrictChatRoom || isFocused) {
      this.instance.style.display = "none";
      this.close();

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      return;
    }

    // We are on the active room screen without character focus
    this.instance.style.display = "flex";

    const tab = this.tabElement;
    if (tab) {
      const showTab = this.getSetting<boolean>("showDrawerTab", true);
      tab.style.display = showTab ? "flex" : "none";
    }

    this.syncToChat();

    if (!this.resizeObserver) {
      const chatLog =
        this.chatLogElement || document.getElementById("TextAreaChatLog");
      if (chatLog) {
        this.resizeObserver = new ResizeObserver(() => this.syncToChat());
        this.resizeObserver.observe(chatLog);
      }
    }
  }

  public refresh(): void {
    const content = this.instance?.querySelector("#CRABS_Drawer_Roster");
    const title = this.instance?.querySelector("#drawer-title") as HTMLElement;
    const header = this.instance?.querySelector(
      ".CRABS_wrapper_header",
    ) as HTMLElement;

    const helpIconContainer = this.instance?.querySelector(
      ".CRABS_Drawer_Help_Icon",
    ) as HTMLElement;
    const settingsIconContainer = this.instance?.querySelector(
      ".CRABS_Drawer_Settings_Icon",
    ) as HTMLElement;
    const layoutIcons = this.instance?.querySelectorAll(
      ".CRABS_Drawer_Layout_Icon",
    );
    const historyIconContainer = this.instance?.querySelector(
      ".CRABS_Drawer_History_Icon",
    ) as HTMLElement;
    const sortIconContainer = this.instance?.querySelector(
      "#CRABS_Drawer_Sort_Icon_Container",
    ) as HTMLElement;
    const closeIconContainer = this.instance?.querySelector(
      ".CRABS_Drawer_Close_Icon",
    ) as HTMLElement;
    const sortContainer = this.instance?.querySelector(
      "#CRABS_sort_container",
    ) as HTMLElement;
    const sortDropdown = this.instance?.querySelector(
      "#CRABS_sort_dropdown",
    ) as HTMLSelectElement;

    if (settingsIconContainer)
      settingsIconContainer.innerHTML = Assets.printimage({
        key: "settings",
        css_class_override: "CRABS_Drawer_Settings_Icon",
      });
    if (closeIconContainer)
      closeIconContainer.innerHTML = Assets.printimage({
        key: "close",
        css_class_override: "CRABS_Drawer_Close_Icon",
      });
    if (sortIconContainer)
      sortIconContainer.innerHTML = Assets.printimage({
        key: "sort",
        css_class_override: "CRABS_Drawer_Sort_Icon",
      });
    if (historyIconContainer && this.activePage !== "history") {
      historyIconContainer.innerHTML = Assets.printimage({
        key: "history" as any,
        css_class_override: "CRABS_Drawer_History_Icon",
      });
    }

    if (sortDropdown) {
      const currentSort = sortDropdown.value || "natural";
      sortDropdown.innerHTML = `
        <option value="natural">${translate("roster.sort_options.natural")}</option>
        <option value="role">${translate("roster.sort_options.role")}</option>
        <option value="ds">${translate("roster.sort_options.ds")}</option>
        <option value="lovers">${translate("roster.sort_options.lovers")}</option>
        <option value="friends">${translate("roster.sort_options.friends")}</option>
        <option value="whitelist">${translate("roster.sort_options.whitelist")}</option>
        <option value="blacklist">${translate("roster.sort_options.blacklist")}</option>
      `;
      sortDropdown.value = currentSort;
    }

    const globalWin = window as any;
    const isRoomReady =
      Boolean(globalWin.ChatRoomData) ||
      (typeof globalWin.ServerPlayerIsInChatRoom === "function" &&
        globalWin.ServerPlayerIsInChatRoom()) ||
      Boolean(globalWin.Player?.LastChatRoom);

    if (content && isRoomReady) {
      header?.classList.toggle("help-active", this.activePage === "help");
      header?.classList.toggle("history-active", this.activePage === "history");
      header?.classList.toggle("keys-active", this.activePage === "keys");

      const setLayoutVisible = (visible: boolean) => {
        layoutIcons?.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (visible) {
            htmlEl.style.setProperty("visibility", "visible", "important");
            htmlEl.style.setProperty("pointer-events", "auto", "important");
            htmlEl.removeAttribute("data-hidden");
          } else {
            htmlEl.style.setProperty("visibility", "hidden", "important");
            htmlEl.style.setProperty("pointer-events", "none", "important");
            htmlEl.setAttribute("data-hidden", "true");
          }
        });
      };

      const view = Drawer.registeredViews.get(this.activePage);

      if (view) {
        try {
          const computedTitle =
            typeof view.title === "function" ? view.title() : "";
          if (title && title.textContent !== computedTitle) {
            title.textContent = computedTitle;
          }

          if (helpIconContainer) {
            const iconKey = this.activePage === "help" ? "roster" : "help";
            helpIconContainer.innerHTML = Assets.printimage({
              key: iconKey,
              css_class_override: "CRABS_Drawer_Help_Icon",
            });
            helpIconContainer.setAttribute("data-icon", iconKey);
          }

          if (historyIconContainer) {
            historyIconContainer.setAttribute(
              "data-active",
              this.activePage === "history" ? "true" : "false",
            );
          }

          if (sortContainer) {
            sortContainer.style.setProperty(
              "display",
              view.showSort ? "flex" : "none",
              "important",
            );
          }

          setLayoutVisible(Boolean(view.showLayout));
          if (view.showLayout) {
            layoutIcons?.forEach((el) => {
              (el as HTMLElement).innerHTML = Assets.printimage({
                key: this.getLayoutIconKey() as any,
                tooltip_override: this.t("drawer.tooltips.layout"),
                css_class_override: "CRABS_Drawer_Layout_Icon",
              });
            });
          }

          content.innerHTML =
            typeof view.render === "function" ? view.render() : "";

          if (this.instance && typeof view.onMount === "function") {
            view.onMount(this.instance);
          }
        } catch (viewErr) {
          console.error(
            `[CRABS Drawer] Error rendering drawer view '${this.activePage}':`,
            viewErr,
          );
          content.innerHTML = `<div style="padding: 16px; color: #ff6666;">Failed to load view.</div>`;
        }
      }

      if (this.instance) {
        for (const injector of Drawer.registeredInjectors) {
          try {
            injector(this.instance);
          } catch (injectorErr) {
            console.error(
              "[CRABS Drawer] Error executing drawer UI injector:",
              injectorErr,
            );
          }
        }
      }

      this.syncToChat();
    }
  }

  public override async openSettings(): Promise<void> {
    this.close();
    await super.openSettings();
  }

  private bindEvents(): void {
    if (!this.instance) return;

    const tab = this.instance.querySelector("#drawer-tab") as HTMLElement;
    if (tab) {
      tab.addEventListener("click", () => {
        if (!this.isOpen) this.refresh();
        this.toggle();
      });
    }

    this.instance.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      if (target.closest(".CRABS_Drawer_Help_Icon")) {
        this.activePage = this.activePage === "help" ? "roster" : "help";
        this.refresh();
      } else if (target.closest(".CRABS_Drawer_Settings_Icon")) {
        this.openSettings();
      } else if (target.closest(".CRABS_Drawer_History_Icon")) {
        this.activePage = this.activePage === "history" ? "roster" : "history";
        this.refresh();
      } else if (target.closest(".CRABS_Drawer_Layout_Icon")) {
        if (
          this.activePage === "help" ||
          this.activePage === "history" ||
          this.activePage === "keys"
        )
          return;

        try {
          Drawer.stateDelegate?.cycleLayout?.();
        } catch (e) {
          console.error("[CRABS Drawer] Error cycling drawer layout:", e);
        }
        this.refresh();
      } else if (target.closest(".CRABS_Drawer_Close_Icon")) {
        event.stopPropagation();
        if (this.activePage !== "roster") {
          this.activePage = "roster";
          this.refresh();
        } else {
          this.close();
        }
      }
    });
  }

  public toggle(page?: DrawerPage): void {
    if (!page) {
      this.isOpen ? this.close() : this.open();
      return;
    }

    const isCurrentPage = this.activePage === page;

    if (this.isOpen && isCurrentPage) {
      this.close();
      return;
    }

    this.open(page);
  }

  public open(page?: DrawerPage): void {
    if (!this.instance) return;

    let isMapActive = false;
    try {
      isMapActive = Boolean(this.isMap());
    } catch {
      isMapActive = false;
    }

    if (page === "keys" && !isMapActive) {
      Notification.send({
        message: translate("drawer.errors.not_on_map"),
      });
      return;
    }

    this.activePage = page || "roster";

    this.refresh();
    this.isOpen = true;
    this.instance.classList.remove("drawer-closed");
    this.instance.classList.add("drawer-open");
  }

  public close(): void {
    if (!this.instance) return;
    this.isOpen = false;
    this.instance.classList.remove("drawer-open");
    this.instance.classList.add("drawer-closed");

    try {
      const currentView = Drawer.registeredViews.get(this.activePage);
      currentView?.onDeactivate?.();
    } catch (err) {
      console.error("[CRABS Drawer] Error during view onDeactivate:", err);
    }

    this.activePage = "roster";
    try {
      Drawer.stateDelegate?.onClearTracking?.();
    } catch (err) {
      console.error("[CRABS Drawer] Error clearing delegate tracking:", err);
    }
  }
}
