/**
 * CRABS Drawer Module
 *
 * This module implements the sliding drawer interface for the CRABS mod.
 * It provides:
 * - A persistent UI container for the roster and help screens
 * - Automatic visibility management based on game state
 * - Integration with the game's chat log dimensions
 * - Event handling for navigation and interaction
 * - Event-driven rendering based on the Roster module's state
 */

import { CRABS_Base, PerformanceLevel } from "../base";
import { Assets } from "../assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Roster } from "../roster";
import "./templates/drawer.css";
import drawertemplate from "./templates/drawer.html";

import { Help } from "../help";
import { WhisperPlus } from "../whisperplus";
import { Settings } from "../settings";

import * as locales from "./i18n";

/**
 * Class representing the side drawer UI.
 * Manages the sliding panel that contains the Roster, Help, and Settings access.
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
  /** Reference to the Roster module for rendering player lists. */
  private rosterModule: Roster;
  /** Reference to the Help module for rendering documentation. */
  private helpModule: Help;
  /** Reference to the WhisperPlus module for UI injection. */
  private whisperPlusModule: WhisperPlus;
  /** Observer to keep the drawer aligned with the chat log resizing. */
  private resizeObserver: ResizeObserver | null = null;
  /** Tracks if the drawer is currently displaying the Help view instead of the Roster. */
  private showingHelp: boolean = false;
  /** Counter used to throttle frame updates based on performance tier. */
  private updateTick: number = 0;
  /** Cached reference to the tab element to prevent DOM queries in the render loop */
  private tabElement: HTMLElement | null = null;
  /** Cached reference to the chat log element */
  private chatLogElement: HTMLElement | null = null;
  /** Tracks the last known performance state to trigger visual swaps */
  private lastPerfLevel: PerformanceLevel = PerformanceLevel.NORMAL;

  /**
   * Initializes the Drawer module and sets up the Singleton instance.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   * @param {Roster} roster - The Roster module instance.
   * @param {Help} help - The Help module instance.
   * @param {WhisperPlus} whisperPlus - The WhisperPlus module instance.
   */
  constructor(
    CRABS: ModSDKModAPI,
    roster: Roster,
    help: Help,
    whisperPlus: WhisperPlus,
  ) {
    super(CRABS, "drawer", locales);
    Drawer._instance = this;
    this.rosterModule = roster;
    this.helpModule = help;
    this.whisperPlusModule = whisperPlus;

    CRABS_Base.registerKeybind(
      "crabs_drawer_toggle",
      this.t("keybinds.toggle_name"),
      this.t("keybinds.toggle_desc"),
      "KeyD",
      () => {
        this.toggle();
        return true;
      },
    );

    this.init();
  }

  /** Toggles the drawer open/closed globally. */
  public static toggle(): void {
    Drawer._instance?.toggle();
  }
  /** Opens the drawer globally. */
  public static open(): void {
    Drawer._instance?.open();
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
    return Drawer._instance?.showingHelp ?? false;
  }
  /** Overrides the current view state of the drawer.
   * @param {boolean} value - True to show Help, false to show Roster.
   */
  public static setShowingHelp(value: boolean): void {
    if (Drawer._instance) Drawer._instance.showingHelp = value;
  }
  /** Triggers the easter egg visual effect on the drawer tab. */
  public static RaveTab(): void {
    Drawer._instance?.RaveTab();
  }

  /** Caches the last known coordinates of the chat log to prevent layout thrashing */
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
    switch (this.rosterModule.layoutMode) {
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
   * Opens the drawer and immediately routes to the Help tab.
   */
  public openHelp(): void {
    this.showingHelp = true;
    this.open();
  }

  /**
   * Static accessor to show the Help screen inside the drawer.
   */
  public static openHelp(): void {
    Drawer.updateVisibility();
    Drawer._instance?.openHelp();
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

    const targetMode =
      !lowPerformance && Settings.instance.data.animatedCrabsLogo
        ? "animated"
        : "static";

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
   * Monitors performance state and executes surgical DOM updates to the roster.
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

        const expectedMode =
          !isLowPerformance && Settings.instance.data.animatedCrabsLogo
            ? "animated"
            : "static";
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

          if (
            this.isOpen &&
            !this.showingHelp &&
            !this.rosterModule.isShowingHistory
          ) {
            if (this.rosterModule.isDirty) {
              const rosterRoot = this.instance?.querySelector(
                ".CRABS_roster_center_table",
              ) as HTMLElement;

              if (rosterRoot) {
                this.rosterModule.updateRosterUI(this.instance!);
              } else {
                this.refresh();
              }

              this.rosterModule.isDirty = false;
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

    const roomName = chatRoomData?.Name || this.t("header.title_default");
    const title = `CRABS: ${roomName}`;

    const logoKey = Settings.instance.data.animatedCrabsLogo
      ? "animated_logo"
      : "static_logo";

    const templateVars = {
      Help: Assets.printimage({
        key: "help",
        tooltip_override: this.t("tooltips.help"),
        css_class_override: "CRABS_Drawer_Help_Icon",
      }),
      Settings: Assets.printimage({
        key: "settings",
        tooltip_override: this.t("tooltips.settings"),
        css_class_override: "CRABS_Drawer_Settings_Icon",
      }),
      Layout: Assets.printimage({
        key: this.getLayoutIconKey() as any,
        tooltip_override: this.t("tooltips.layout"),
        css_class_override: "CRABS_Drawer_Layout_Icon",
      }),
      History: Assets.printimage({
        key: "history" as any,
        tooltip_override: "Toggle Room History",
        css_class_override: "CRABS_Drawer_History_Icon",
      }),
      TabIcon: Assets.printimage({
        key: logoKey,
        tooltip_override: this.t("tooltips.tab"),
      }),
      TitleBar: title,
      Close: Assets.printimage({
        key: "close",
        tooltip_override: this.t("tooltips.close"),
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
    const compact = Settings.instance.data.compactDrawer;

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

    if (!Settings.instance.data.enableDrawer) {
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
        tab.style.display =
          Settings.instance.data.showDrawerTab && !isFocused ? "flex" : "none";
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
    const helpIconContainer = this.instance?.querySelector(
      ".CRABS_Drawer_Help_Icon",
    );
    const layoutIconContainer = this.instance?.querySelector(
      ".CRABS_Drawer_Layout_Icon",
    ) as HTMLElement;
    const sortContainer = this.instance?.querySelector(
      "#CRABS_sort_container",
    ) as HTMLElement;
    const historyIconContainer = this.instance?.querySelector(
      ".CRABS_Drawer_History_Icon",
    ) as HTMLElement;

    const isRoomReady =
      typeof ChatRoomData !== "undefined" && ChatRoomData !== null;

    if (content && isRoomReady) {
      const roomName = ChatRoomData.Name || this.t("header.title_default");
      const rosterTitle = `CRABS: ${roomName}`;
      const helpTitle = `CRABS: ${this.t("header.title_help")}`;
      const historyTitle = `CRABS: ${roomName} (History)`;

      if (this.showingHelp) {
        if (title && title.textContent !== helpTitle)
          title.textContent = helpTitle;

        if (
          helpIconContainer &&
          helpIconContainer.getAttribute("data-icon") !== "roster"
        ) {
          helpIconContainer.innerHTML = Assets.printimage({
            key: "roster",
            tooltip_override: this.t("tooltips.roster"),
            css_class_override: "CRABS_Drawer_Help_Icon",
          });
          helpIconContainer.setAttribute("data-icon", "roster");
        }

        // Hide roster & history controls when viewing Help
        if (sortContainer) sortContainer.style.display = "none";
        if (layoutIconContainer) layoutIconContainer.style.display = "none";
        if (historyIconContainer)
          historyIconContainer.setAttribute("data-active", "false");

        content.innerHTML = this.helpModule.showHelp(false);
      } else if (this.rosterModule.isShowingHistory) {
        if (title && title.textContent !== historyTitle)
          title.textContent = historyTitle;

        // Reset help icon if returning from help view
        if (
          helpIconContainer &&
          helpIconContainer.getAttribute("data-icon") !== "help"
        ) {
          helpIconContainer.innerHTML = Assets.printimage({
            key: "help",
            tooltip_override: this.t("tooltips.help"),
            css_class_override: "CRABS_Drawer_Help_Icon",
          });
          helpIconContainer.setAttribute("data-icon", "help");
        }

        // Toggle button states for History mode
        if (historyIconContainer)
          historyIconContainer.setAttribute("data-active", "true");
        if (sortContainer) sortContainer.style.display = "none";
        if (layoutIconContainer) layoutIconContainer.style.display = "none";

        content.innerHTML = this.rosterModule.buildHistory();
        this.rosterModule.initScrollingOverflow();

        if (this.instance) {
          this.rosterModule.buildui(undefined, undefined, this.instance);
        }
      } else {
        if (title && title.textContent !== rosterTitle)
          title.textContent = rosterTitle;

        if (
          helpIconContainer &&
          helpIconContainer.getAttribute("data-icon") !== "help"
        ) {
          helpIconContainer.innerHTML = Assets.printimage({
            key: "help",
            tooltip_override: this.t("tooltips.help"),
            css_class_override: "CRABS_Drawer_Help_Icon",
          });
          helpIconContainer.setAttribute("data-icon", "help");
        }

        // Restore active roster controls
        if (historyIconContainer)
          historyIconContainer.setAttribute("data-active", "false");
        if (sortContainer) sortContainer.style.display = "flex";
        if (layoutIconContainer) {
          layoutIconContainer.style.display = "flex";
          layoutIconContainer.innerHTML = Assets.printimage({
            key: this.getLayoutIconKey() as any,
            tooltip_override: this.t("tooltips.layout"),
            css_class_override: "CRABS_Drawer_Layout_Icon",
          });
        }

        content.innerHTML = this.rosterModule.buildroster("all", false);
        this.rosterModule.initScrollingOverflow();

        if (this.instance) {
          this.rosterModule.buildui(undefined, undefined, this.instance);
          this.whisperPlusModule.buildui(undefined, undefined, this.instance);
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
        if (this.rosterModule.isShowingHistory) {
          this.rosterModule.isShowingHistory = false;
        }
        this.showingHelp = !this.showingHelp;
        this.refresh();
      } else if (target.closest(".CRABS_Drawer_Settings_Icon")) {
        this.openSettings();
      } else if (target.closest(".CRABS_Drawer_History_Icon")) {
        if (this.showingHelp) {
          this.showingHelp = false;
        }
        this.rosterModule.isShowingHistory =
          !this.rosterModule.isShowingHistory;
        this.refresh();
      } else if (target.closest(".CRABS_Drawer_Layout_Icon")) {
        // Prevent layout cycling if Help or History view is active
        if (this.showingHelp || this.rosterModule.isShowingHistory) return;

        const layouts = [
          "layout-grid",
          "layout-mobile-stack",
          "layout-compact",
        ];
        const currentIndex = layouts.indexOf(this.rosterModule.layoutMode);
        const nextLayout =
          layouts[(currentIndex + 1) % layouts.length] || "layout-grid";

        this.rosterModule.layoutMode = nextLayout;
        this.refresh();

        const table = this.instance?.querySelector(
          ".CRABS_roster_center_table",
        );
        if (table) {
          table.classList.remove(...layouts);
          table.classList.add(nextLayout);
        }
      } else if (target.closest(".CRABS_Drawer_Close_Icon")) {
        event.stopPropagation();
        if (this.showingHelp || this.rosterModule.isShowingHistory) {
          this.showingHelp = false;
          this.rosterModule.isShowingHistory = false;
          this.refresh();
        } else {
          this.close();
        }
      }
    });
  }

  /**
   * Alternates the drawer's state between open and closed.
   *
   * @returns {void}
   */
  public toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  /**
   * Opens the drawer and refreshes content.
   *
   * @returns {void}
   */
  public open(): void {
    if (!this.instance) return;
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

    if (this.rosterModule) {
      this.rosterModule.clearTracking();
    }
  }
}
