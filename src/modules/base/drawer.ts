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
 */

import { CRABS_Base, PerformanceLevel } from "./core";
import { Notification } from "../notifications/notifications";
import { isMap } from "./context";
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

  /**
   * Registers a view page definition with the Drawer.
   *
   * @param {DrawerViewDefinition} viewDef - View definition and render delegate.
   */
  public static registerView(viewDef: DrawerViewDefinition): void {
    Drawer.registeredViews.set(viewDef.id, viewDef);
  }

  /**
   * Registers an auxiliary UI injection callback executed after the drawer mounts content.
   *
   * @param {DrawerUIInjector} injector - Injection callback.
   */
  public static registerUIInjector(injector: DrawerUIInjector): void {
    Drawer.registeredInjectors.add(injector);
  }

  /**
   * Registers the primary state delegate driving layout modes, key checks, and dirty cycles.
   *
   * @param {DrawerStateDelegate} delegate - State provider.
   */
  public static registerStateDelegate(delegate: DrawerStateDelegate): void {
    Drawer.stateDelegate = delegate;
  }

  // ─────────────────────────────────────────────────────────────
  // Static Control Facades
  // ─────────────────────────────────────────────────────────────

  /**
   * Toggles the drawer open/closed globally, optionally targeting a specific page.
   * @param {DrawerPage} [page] - Optional view to toggle or switch to.
   */
  public static toggle(page?: DrawerPage): void {
    Drawer._instance?.toggle(page);
  }

  /**
   * Opens the drawer globally, optionally routing to a specific page.
   * @param {DrawerPage} [page] - Optional view to display upon opening.
   */
  public static open(page?: DrawerPage): void {
    Drawer.updateVisibility();
    Drawer._instance?.open(page);
  }

  /** Closes the drawer globally. */
  public static close(): void {
    Drawer._instance?.close();
  }

  /** Evaluates game state to determine if the drawer should be visible or hidden. */
  public static updateVisibility(): void {
    Drawer._instance?.updateVisibility();
  }

  /** Forces a re-render of the drawer's current content. */
  public static refresh(): void {
    Drawer._instance?.refresh();
  }

  /** Checks if the help menu is currently being displayed.
   * @returns {boolean} True if the help screen is active.
   */
  public static isShowingHelp(): boolean {
    return Drawer._instance?.activePage === "help";
  }

  /** Overrides the current view state of the drawer.
   * @param {boolean} value - True to show Help, false to show Roster.
   */
  public static setShowingHelp(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.activePage = value ? "help" : "roster";
    }
  }

  /** Checks if the keys page is currently being displayed.
   * @returns {boolean} True if the keys screen is active.
   */
  public static isShowingKeys(): boolean {
    return Drawer._instance?.activePage === "keys";
  }

  /** Overrides the current view state of the drawer.
   * @param {boolean} value - True to show Keys, false to show Roster.
   */
  public static setShowingKeys(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.activePage = value ? "keys" : "roster";
    }
  }

  /** Checks if the history menu is currently being displayed.
   * @returns {boolean} True if the history screen is active.
   */
  public static isShowingHistory(): boolean {
    return Drawer._instance?.activePage === "history";
  }

  /** Overrides the current history view state of the drawer.
   * @param {boolean} value - True to show History, false to return to Roster.
   */
  public static setShowingHistory(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.activePage = value ? "history" : "roster";
    }
  }

  /** Triggers the easter egg visual effect on the drawer tab. */
  public static RaveTab(): void {
    Drawer._instance?.RaveTab();
  }

  /** Caches the last known coordinates of the chat log to prevent layout thrashing. */
  private lastRect = {
    top: -1,
    width: -1,
    height: -1,
    right: -1,
    compact: false,
  };

  /**
   * Helper mapping the active layout mode string to its corresponding asset key.
   *
   * @private
   * @returns {string}
   */
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

  /**
   * Temporarily swaps the drawer tab icon to a rave variant for 10 seconds.
   *
   * @returns {void}
   */
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

  /**
   * Bootstraps the drawer layout, injecting it into the DOM and establishing global hotkeys.
   *
   * @private
   * @returns {void}
   */
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
          if ((window as any).CurrentCharacter !== null) {
            (window as any).DialogLeave();
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

  /**
   * Safe helper to read settings without a hard import dependency.
   *
   * @private
   */
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

  /**
   * Evaluates user settings and system performance to dictate visual intensity.
   * Restricts animations and intensive CSS effects when the engine is struggling.
   *
   * @param {boolean} lowPerformance - Indicates if the system is currently under heavy load.
   * @private
   * @returns {void}
   */
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

  /**
   * Hooks into the game's render loop to process updates.
   * Monitors performance state and executes surgical DOM updates via the registered state delegate.
   *
   * @private
   * @returns {void}
   */
  private setupDynamicUpdates(): void {
    // Re-render when the base game language switches
    this.safeHook(
      "TranslationLoad",
      10,
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
      10,
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
          this.syncToChat();

          // Auto-revert keys view back to roster if leaving a map
          const isMap = this.isMap();
          if (this.wasMapActive && !isMap) {
            if (this.activePage === "keys") {
              this.activePage = "roster";
              this.refresh();
            }
          }
          this.wasMapActive = isMap;

          // Detect instant key pickups/drops via delegate
          if (
            this.isOpen &&
            isMap &&
            this.activePage !== "help" &&
            this.activePage !== "history"
          ) {
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
          }

          if (this.isOpen && this.activePage !== "help") {
            if (
              Drawer.stateDelegate?.isDirty &&
              Drawer.stateDelegate.isDirty()
            ) {
              if (this.activePage === "history" || this.activePage === "keys") {
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
          }
        }
        return result;
      },
    );
  }

  /**
   * Compiles the drawer HTML template and injects it into the document body.
   * Binds internal events once the element is created.
   *
   * @private
   * @returns {void}
   */
  private setupElement(): void {
    if (this.instance) return;

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
      this.syncToChat();
    }
  }

  /**
   * Aligns the drawer UI to the dimensions and position of the native game chat log.
   *
   * @private
   * @returns {void}
   */
  private syncToChat(): void {
    const chatLog = document.getElementById("TextAreaChatLog");
    if (!chatLog || !this.instance) return;

    const rect = chatLog.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

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
   * Determines whether the drawer should be injected into the DOM workflow.
   *
   * @returns {void}
   */
  public updateVisibility(): void {
    if (!this.instance) return;

    const enableDrawer = this.getSetting<boolean>("enableDrawer", true);
    if (!enableDrawer) {
      this.instance.style.display = "none";
      this.close();
      return;
    }

    const inChatRoom =
      typeof ChatRoomData !== "undefined" &&
      ChatRoomData !== null &&
      (typeof CurrentScreen === "undefined" || CurrentScreen === "ChatRoom");

    if (!inChatRoom) {
      this.instance.style.display = "none";
      this.close();

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    } else {
      const isFocused = (window as any).CurrentCharacter !== null;
      this.instance.style.display = isFocused ? "none" : "flex";

      const tab = this.tabElement;
      if (tab) {
        const showTab = this.getSetting<boolean>("showDrawerTab", true);
        tab.style.display = showTab && !isFocused ? "flex" : "none";
      }

      if (!this.resizeObserver) {
        const chatLog = this.chatLogElement;
        if (chatLog) {
          this.resizeObserver = new ResizeObserver(() => this.syncToChat());
          this.resizeObserver.observe(chatLog);
          this.syncToChat();
        }
      }
    }
  }

  /**
   * Completely rebuilds the inner HTML of the drawer based on context.
   *
   * @returns {void}
   */
  public refresh(): void {
    const content = this.instance?.querySelector("#CRABS_Drawer_Roster");
    const title = this.instance?.querySelector("#drawer-title") as HTMLElement;
    const header = this.instance?.querySelector(
      ".CRABS_wrapper_header",
    ) as HTMLElement;

    // Grab all icon containers
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

    // Force re-render of static elements so live language changes take effect immediately
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

    // Rebuild Dropdown options dynamically on language change
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

    const isRoomReady =
      typeof ChatRoomData !== "undefined" && ChatRoomData !== null;

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

      // Query registered view provider
      const view = Drawer.registeredViews.get(this.activePage);

      if (view) {
        const computedTitle = view.title();
        if (title && title.textContent !== computedTitle) {
          title.textContent = computedTitle;
        }

        // Handle icon state updates
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

        setLayoutVisible(!!view.showLayout);
        if (view.showLayout) {
          layoutIcons?.forEach((el) => {
            (el as HTMLElement).innerHTML = Assets.printimage({
              key: this.getLayoutIconKey() as any,
              tooltip_override: this.t("drawer.tooltips.layout"),
              css_class_override: "CRABS_Drawer_Layout_Icon",
            });
          });
        }

        // Render content
        content.innerHTML = view.render();

        // Trigger onMount callback
        if (this.instance && view.onMount) {
          view.onMount(this.instance);
        }
      }

      // Execute any registered auxiliary injectors (e.g. WhisperPlus)
      if (this.instance) {
        for (const injector of Drawer.registeredInjectors) {
          injector(this.instance);
        }
      }

      this.syncToChat();
    }
  }

  /**
   * Overrides the base class openSettings to ensure drawer closes before opening modal.
   *
   * @override
   * @returns {Promise<void>}
   */
  public override async openSettings(): Promise<void> {
    this.close();
    await super.openSettings();
  }

  /**
   * Attaches click event listeners to the header elements.
   *
   * @private
   * @returns {void}
   */
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

        Drawer.stateDelegate?.cycleLayout?.();
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

  /**
   * Alternates the drawer's state between open and closed, or switches to a target page.
   * - If closed: opens directly to the requested page.
   * - If open on the requested page: closes the drawer.
   * - If open on a different page: switches view without closing.
   * - If no page specified: standard toggle behavior.
   *
   * @param {DrawerPage} [page] - The specific view to target.
   * @returns {void}
   */
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

  /**
   * Opens the drawer and refreshes content, optionally routing to a specific page.
   *
   * @param {DrawerPage} [page] - Optional view to route to ("roster", "help", or "history").
   * @returns {void}
   */
  public open(page?: DrawerPage): void {
    if (!this.instance) return;

    if (page === "keys" && !isMap()) {
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

  /**
   * Closes the drawer.
   *
   * @returns {void}
   */
  public close(): void {
    if (!this.instance) return;
    this.isOpen = false;
    this.instance.classList.remove("drawer-open");
    this.instance.classList.add("drawer-closed");

    // Deactivate active page
    const currentView = Drawer.registeredViews.get(this.activePage);
    currentView?.onDeactivate?.();

    this.activePage = "roster";
    Drawer.stateDelegate?.onClearTracking?.();
  }
}
