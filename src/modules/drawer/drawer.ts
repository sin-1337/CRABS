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

import { CRABS_Base, PerformanceLevel } from "base";
import { Assets } from "assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Roster, getKeyState } from "roster";
import "./templates/drawer.css";
import drawertemplate from "./templates/drawer.html";

import { Help } from "help";
import { WhisperPlus } from "whisperplus";
import { Settings } from "settings";

import locales from "./i18n.json";

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
  /** Tracks if the drawer is currently displaying the Help view. */
  private showingHelp: boolean = false;
  /** Tracks if the drawer is currently displaying the History view. */
  private showingHistory: boolean = false;
  /** Tracks if the drawer is currently displaying the keys view */
  private showingKeys: boolean = false;
  /** Counter used to throttle frame updates based on performance tier. */
  /** Tracks the previous key inventory bitstring to detect pickups/drops immediately. */
  private lastKnownKeys: string = "";
  private updateTick: number = 0;
  /** Tracks whether the map was active on the previous update cycle. */
  private wasMapActive: boolean = false;
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
    return Drawer._instance?.showingHelp ?? false;
  }

  /** Overrides the current view state of the drawer.
   * @param {boolean} value - True to show Help, false to show Roster.
   */
  public static setShowingHelp(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.showingHelp = value;
      if (value) {
        Drawer._instance.showingHistory = false;
        Drawer._instance.rosterModule.isShowingHistory = false;
      }
    }
  }

  /** Checks if the keys page is currently being displayed.
   * @returns {boolean} True if the keys screen is active.
   */
  public static isShowingKeys(): boolean {
    return Drawer._instance?.showingKeys ?? false;
  }

  /** Overrides the current view state of the drawer.
   * @param {boolean} value - True to show Keys, false to show Roster.
   */
  public static setShowingKeys(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.showingKeys = value;
      Drawer._instance.rosterModule.isShowingKeys = value;
      if (value) {
        Drawer._instance.showingHelp = false;
        Drawer._instance.showingHistory = false;
        Drawer._instance.rosterModule.isShowingHistory = false;
      }
    }
  }

  /** Checks if the history menu is currently being displayed.
   * @returns {boolean} True if the history screen is active.
   */
  public static isShowingHistory(): boolean {
    return Drawer._instance?.showingHistory ?? false;
  }

  /** Overrides the current history view state of the drawer.
   * @param {boolean} value - True to show History, false to return to Roster.
   */
  public static setShowingHistory(value: boolean): void {
    if (Drawer._instance) {
      Drawer._instance.showingHistory = value;
      Drawer._instance.rosterModule.isShowingHistory = value;
      if (value) {
        Drawer._instance.showingHelp = false;
      }
    }
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

          // Auto-revert keys view back to roster if leaving a map
          const isMap = this.isMap();
          if (this.wasMapActive && !isMap) {
            if (this.showingKeys) {
              this.showingKeys = false;
              this.rosterModule.isShowingKeys = false;
              this.refresh();
            }
          }
          this.wasMapActive = isMap;

          // Detect instant key pickups/drops without waiting on roster dirty flag
          if (
            this.isOpen &&
            isMap &&
            !this.showingHelp &&
            !this.showingHistory
          ) {
            const currentKeys = getKeyState().keyStateString;
            if (this.lastKnownKeys !== currentKeys) {
              this.lastKnownKeys = currentKeys;

              if (this.showingKeys) {
                this.refresh();
              } else if (this.instance) {
                this.rosterModule.updateRosterUI(this.instance);
              }
            }
          }

          if (this.isOpen && !this.showingHelp) {
            if (this.rosterModule.isDirty) {
              if (this.showingHistory || this.showingKeys) {
                this.refresh();
              } else {
                const rosterRoot = this.instance?.querySelector(
                  ".CRABS_roster_center_table",
                ) as HTMLElement;

                if (rosterRoot) {
                  this.rosterModule.updateRosterUI(this.instance!);
                } else {
                  this.refresh();
                }
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
    const title = `${roomName}`;

    const logoKey = Settings.instance.data.animatedCrabsLogo
      ? "animated_logo"
      : "static_logo";

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
        tooltip_override: this.t("tooltips.layout"),
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
    const keysTitle = this.t("header.title_keys") || "Map Keys";
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
    if (historyIconContainer && !this.showingHistory) {
      historyIconContainer.innerHTML = Assets.printimage({
        key: "history" as any,
        css_class_override: "CRABS_Drawer_History_Icon",
      });
    }

    // Rebuild Dropdown options dynamically on language change
    if (sortDropdown) {
      const currentSort = sortDropdown.value || "natural";
      sortDropdown.innerHTML = `
        <option value="natural">${this.t("roster.sort_options.natural")}</option>
        <option value="role">${this.t("roster.sort_options.role")}</option>
        <option value="ds">${this.t("roster.sort_options.ds")}</option>
        <option value="lovers">${this.t("roster.sort_options.lovers")}</option>
        <option value="friends">${this.t("roster.sort_options.friends")}</option>
        <option value="whitelist">${this.t("roster.sort_options.whitelist")}</option>
        <option value="blacklist">${this.t("roster.sort_options.blacklist")}</option>
      `;
      sortDropdown.value = currentSort;
    }

    const isRoomReady =
      typeof ChatRoomData !== "undefined" && ChatRoomData !== null;

    if (content && isRoomReady) {
      const roomName = ChatRoomData.Name || this.t("header.title_default");
      const rosterTitle = `${roomName}`;
      const helpTitle = `${this.t("header.title_help")}`;
      const historyTitle = this.t("header.title_history") || "History";

      header?.classList.toggle("help-active", this.showingHelp);
      header?.classList.toggle(
        "history-active",
        !this.showingHelp && this.showingHistory,
      );

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

      if (this.showingHelp) {
        if (title && title.textContent !== helpTitle)
          title.textContent = helpTitle;

        if (helpIconContainer) {
          helpIconContainer.innerHTML = Assets.printimage({
            key: "roster",
            css_class_override: "CRABS_Drawer_Help_Icon",
          });
          helpIconContainer.setAttribute("data-icon", "roster");
        }

        if (sortContainer)
          sortContainer.style.setProperty("display", "none", "important");
        if (historyIconContainer)
          historyIconContainer.setAttribute("data-active", "false");
        setLayoutVisible(false);

        content.innerHTML = this.helpModule.showHelp(false);
      } else if (this.showingHistory) {
        if (title && title.textContent !== historyTitle)
          title.textContent = historyTitle;

        if (helpIconContainer) {
          helpIconContainer.innerHTML = Assets.printimage({
            key: "help",
            css_class_override: "CRABS_Drawer_Help_Icon",
          });
          helpIconContainer.setAttribute("data-icon", "help");
        }

        if (historyIconContainer)
          historyIconContainer.setAttribute("data-active", "true");
        if (sortContainer)
          sortContainer.style.setProperty("display", "flex", "important");
        setLayoutVisible(false);

        content.innerHTML = this.rosterModule.buildHistory();
        this.rosterModule.initScrollingOverflow();

        if (this.instance) {
          this.rosterModule.buildui(undefined, undefined, this.instance);
        }
      } else if (this.showingKeys) {
        if (title && title.textContent !== keysTitle)
          title.textContent = keysTitle;

        if (sortContainer)
          sortContainer.style.setProperty("display", "none", "important");

        setLayoutVisible(false);

        content.innerHTML = this.rosterModule.buildKeys();

        if (this.instance) {
          this.rosterModule.buildui(undefined, undefined, this.instance);
        }
      } else {
        if (title && title.textContent !== rosterTitle)
          title.textContent = rosterTitle;

        if (helpIconContainer) {
          helpIconContainer.innerHTML = Assets.printimage({
            key: "help",
            css_class_override: "CRABS_Drawer_Help_Icon",
          });
          helpIconContainer.setAttribute("data-icon", "help");
        }

        if (historyIconContainer)
          historyIconContainer.setAttribute("data-active", "false");
        if (sortContainer)
          sortContainer.style.setProperty("display", "flex", "important");

        setLayoutVisible(true);
        layoutIcons?.forEach((el) => {
          (el as HTMLElement).innerHTML = Assets.printimage({
            key: this.getLayoutIconKey() as any,
            tooltip_override: this.t("tooltips.layout"),
            css_class_override: "CRABS_Drawer_Layout_Icon",
          });
        });

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
        if (this.showingHistory) {
          this.showingHistory = false;
          this.rosterModule.isShowingHistory = false;
        }

        // Exit keys view when opening or closing help
        this.showingKeys = false;
        this.rosterModule.isShowingKeys = false;

        this.showingHelp = !this.showingHelp;
        this.refresh();
      } else if (target.closest(".CRABS_Drawer_Settings_Icon")) {
        this.openSettings();
      } else if (target.closest(".CRABS_Drawer_History_Icon")) {
        if (this.showingHelp) {
          this.showingHelp = false;
        }
        // Exit keys view when opening or closing history
        this.showingKeys = false;
        this.rosterModule.isShowingKeys = false;

        this.showingHistory = !this.showingHistory;
        this.rosterModule.isShowingHistory = this.showingHistory;
        this.refresh();
      } else if (target.closest(".CRABS_Drawer_Layout_Icon")) {
        // Prevent layout cycling if Help or History view is active
        if (this.showingHelp || this.showingHistory) return;

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
        if (this.showingHelp || this.showingHistory || this.showingKeys) {
          this.showingHelp = false;
          this.showingHistory = false;
          this.showingKeys = false;
          this.rosterModule.isShowingHistory = false;
          this.rosterModule.isShowingKeys = false;
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

    const isCurrentPage =
      (page === "help" && this.showingHelp) ||
      (page === "history" && this.showingHistory) ||
      (page === "keys" && this.showingKeys) ||
      (page === "roster" &&
        !this.showingHelp &&
        !this.showingHistory &&
        !this.showingKeys);

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

    if (page) {
      this.showingHelp = page === "help";
      this.showingHistory = page === "history";
      this.showingKeys = page === "keys";
      this.rosterModule.isShowingHistory = page === "history";
      this.rosterModule.isShowingKeys = page === "keys";
    } else {
      // Ignore keys and default to roster view
      this.showingKeys = false;
      this.rosterModule.isShowingKeys = false;
    }

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

    // Reset all subpage views so reopening defaults to roster
    this.showingHelp = false;
    this.showingHistory = false;
    this.showingKeys = false;
    if (this.rosterModule) {
      this.rosterModule.isShowingHistory = false;
      this.rosterModule.isShowingKeys = false;
      this.rosterModule.clearTracking();
    }
  }
}
